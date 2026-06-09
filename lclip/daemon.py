import os
import sys
import json
import time
import hashlib
import subprocess
import threading
import atexit

CACHE_DIR = os.path.expanduser("~/.cache/lclip")
HISTORY_FILE = os.path.join(CACHE_DIR, "history.json")
IMAGES_DIR = os.path.join(CACHE_DIR, "images")
LOCK_FILE = os.path.join(CACHE_DIR, "lclip-ui.lock")

def is_ui_running():
    if not os.path.exists(LOCK_FILE):
        return False
    try:
        with open(LOCK_FILE, "r") as f:
            pid = int(f.read().strip())
        with open(f"/proc/{pid}/cmdline", "r") as f:
            cmdline = f.read()
        return "lclip" in cmdline or "main.py" in cmdline
    except Exception:
        # Clean up stale lock file if process is dead
        try:
            os.remove(LOCK_FILE)
        except OSError:
            pass
        return False

class ClipboardWatcher(threading.Thread):
    def __init__(self):
        super().__init__(name="ClipboardWatcher", daemon=True)
        self.running = True
        self.is_wayland = bool(os.environ.get("WAYLAND_DISPLAY") or os.environ.get("XDG_SESSION_TYPE") == "wayland")
        self.last_text = ""
        self.last_image_hash = ""
        
        # Verify tools
        self.has_wl_clipboard = self._check_cmd("wl-paste")
        self.has_xclip = self._check_cmd("xclip")

    def _check_cmd(self, cmd):
        try:
            subprocess.run(["which", cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            return True
        except Exception:
            return False

    def load_history(self):
        if os.path.exists(HISTORY_FILE):
            try:
                with open(HISTORY_FILE, "r") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def save_history(self, history):
        try:
            with open(HISTORY_FILE, "w") as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            print(f"Error saving history: {e}", file=sys.stderr)

    def add_text_to_history(self, text):
        history = self.load_history()
        
        existing_idx = -1
        pinned = False
        for i, item in enumerate(history):
            if item.get("type") == "text" and item.get("content") == text:
                existing_idx = i
                pinned = item.get("pinned", False)
                break
                
        if existing_idx != -1:
            history.pop(existing_idx)
            
        new_item = {
            "type": "text",
            "content": text,
            "pinned": pinned,
            "timestamp": time.time()
        }
        history.insert(0, new_item)
        history = self.trim_history(history)
        self.save_history(history)

    def add_image_to_history(self, img_bytes, img_hash):
        filename = f"{img_hash}.png"
        filepath = os.path.join(IMAGES_DIR, filename)
        
        if not os.path.exists(filepath):
            try:
                with open(filepath, "wb") as f:
                    f.write(img_bytes)
            except Exception as e:
                print(f"Failed to save image: {e}", file=sys.stderr)
                return

        history = self.load_history()
        existing_idx = -1
        pinned = False
        for i, item in enumerate(history):
            if item.get("type") == "image" and item.get("content") == filename:
                existing_idx = i
                pinned = item.get("pinned", False)
                break
                
        if existing_idx != -1:
            history.pop(existing_idx)
            
        new_item = {
            "type": "image",
            "content": filename,
            "pinned": pinned,
            "timestamp": time.time()
        }
        history.insert(0, new_item)
        history = self.trim_history(history)
        self.save_history(history)

    def trim_history(self, history):
        max_items = 80
        if len(history) <= max_items:
            return history
            
        pinned_items = [item for item in history if item.get("pinned", False)]
        unpinned_items = [item for item in history if not item.get("pinned", False)]
        
        allowed_unpinned = max_items - len(pinned_items)
        if allowed_unpinned < 0:
            allowed_unpinned = 0
            
        trimmed_unpinned = unpinned_items[allowed_unpinned:]
        for item in trimmed_unpinned:
            if item.get("type") == "image":
                img_path = os.path.join(IMAGES_DIR, item.get("content"))
                if os.path.exists(img_path):
                    try:
                        os.remove(img_path)
                    except OSError:
                        pass
                        
        trimmed_history = pinned_items + unpinned_items[:allowed_unpinned]
        trimmed_history.sort(key=lambda x: (1 if x.get("pinned", False) else 0, x.get("timestamp", 0)), reverse=True)
        return trimmed_history

    def run(self):
        print(f"Clipboard watcher started. wayland: {self.is_wayland}, wl-clipboard: {self.has_wl_clipboard}, xclip: {self.has_xclip}")
        
        use_watch = self.is_wayland and self.has_wl_clipboard
        watch_proc = None
        
        if use_watch:
            try:
                watch_proc = subprocess.Popen(
                    ["wl-paste", "--watch", "echo"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                    text=True,
                    bufsize=1
                )
                
                # Ensure the subprocess is cleaned up when the main program exits
                def cleanup_watch():
                    if watch_proc and watch_proc.poll() is None:
                        try:
                            watch_proc.terminate()
                        except Exception:
                            pass
                atexit.register(cleanup_watch)
                
                print("Using wl-paste --watch for event-driven clipboard monitoring.")
            except Exception as e:
                print(f"Failed to start wl-paste --watch: {e}. Falling back to polling.", file=sys.stderr)
                use_watch = False

        while self.running:
            try:
                if is_ui_running():
                    time.sleep(0.5)
                    continue
                    
                if use_watch and watch_proc:
                    # Check if process died
                    if watch_proc.poll() is not None:
                        print("wl-paste --watch process died. Falling back to polling.", file=sys.stderr)
                        use_watch = False
                        continue
                        
                    # Block and wait for clipboard change event (newline from echo)
                    line = watch_proc.stdout.readline()
                    if not line:
                        # EOF, process died
                        continue
                        
                    self._check_wayland_clipboard()
                else:
                    # Fallback to polling
                    if self.is_wayland and self.has_wl_clipboard:
                        self._check_wayland_clipboard()
                    elif self.has_xclip:
                        self._check_x11_clipboard()
                    
                    # 1.5 seconds polling interval for X11 to reduce CPU overhead
                    time.sleep(1.5)
            except Exception as e:
                print(f"Error checking clipboard: {e}", file=sys.stderr)
                time.sleep(1.5)
                
        if watch_proc:
            try:
                watch_proc.terminate()
            except Exception:
                pass

    def _check_wayland_clipboard(self):
        if not self.has_wl_clipboard:
            return
            
        try:
            res_targets = subprocess.run(["wl-paste", "-l"], capture_output=True, timeout=1.0)
            if res_targets.returncode != 0:
                return
            targets = res_targets.stdout.decode("utf-8", errors="ignore").splitlines()
        except Exception:
            return

        is_text = any(t in ["text/plain", "UTF8_STRING", "text/plain;charset=utf-8", "STRING"] for t in targets)
        is_image = any("image/" in t for t in targets)

        if is_text:
            try:
                res_text = subprocess.run(["wl-paste", "-n"], capture_output=True, timeout=1.0)
                text = res_text.stdout.decode("utf-8", errors="ignore").strip()
                if text and text != self.last_text:
                    self.last_text = text
                    self.add_text_to_history(text)
            except Exception:
                pass
        elif is_image:
            try:
                img_type = "image/png"
                for t in targets:
                    if "image/png" in t or "image/jpeg" in t:
                        img_type = t
                        break
                res_img = subprocess.run(["wl-paste", "-t", img_type], capture_output=True, timeout=2.0)
                if res_img.returncode == 0 and res_img.stdout:
                    img_bytes = res_img.stdout
                    img_hash = hashlib.md5(img_bytes).hexdigest()
                    if img_hash != self.last_image_hash:
                        self.last_image_hash = img_hash
                        self.add_image_to_history(img_bytes, img_hash)
            except Exception:
                pass

    def _check_x11_clipboard(self):
        if not self.has_xclip:
            return
            
        try:
            res_text = subprocess.run(
                ["xclip", "-selection", "clipboard", "-o"],
                capture_output=True,
                timeout=1.0
            )
            if res_text.returncode == 0:
                text = res_text.stdout.decode("utf-8", errors="ignore").strip()
                if text and text != self.last_text:
                    self.last_text = text
                    self.add_text_to_history(text)
                    return
        except Exception:
            pass

        try:
            res_targets = subprocess.run(
                ["xclip", "-selection", "clipboard", "-t", "TARGETS", "-o"],
                capture_output=True,
                timeout=1.0
            )
            if res_targets.returncode == 0:
                targets = res_targets.stdout.decode("utf-8", errors="ignore").splitlines()
                if any("image/" in t or "PNG" in t or "JPEG" in t for t in targets):
                    res_img = subprocess.run(
                        ["xclip", "-selection", "clipboard", "-t", "image/png", "-o"],
                        capture_output=True,
                        timeout=2.0
                    )
                    if res_img.returncode == 0 and res_img.stdout:
                        img_bytes = res_img.stdout
                        img_hash = hashlib.md5(img_bytes).hexdigest()
                        if img_hash != self.last_image_hash:
                            self.last_image_hash = img_hash
                            self.add_image_to_history(img_bytes, img_hash)
        except Exception:
            pass

class LclipDaemon:
    def __init__(self):
        self.watcher = ClipboardWatcher()

    def run(self):
        # Ensure directories exist
        os.makedirs(CACHE_DIR, exist_ok=True)
        os.makedirs(IMAGES_DIR, exist_ok=True)
        
        self.watcher.start()
        # Keep main thread alive
        try:
            while True:
                time.sleep(1.0)
        except (KeyboardInterrupt, SystemExit):
            self.watcher.running = False
