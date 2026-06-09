import argparse
import os
import sys
import signal
import time
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QCursor

CACHE_DIR = os.path.expanduser("~/.cache/lclip")
LOCK_FILE = os.path.join(CACHE_DIR, "lclip-ui.lock")

def is_lclip_process(pid):
    try:
        with open(f"/proc/{pid}/cmdline", "r") as f:
            cmdline = f.read()
        return "lclip" in cmdline or "main.py" in cmdline
    except Exception:
        return False

def run_ui():
    # Toggle behavior: if UI is already running, kill it and exit
    if os.path.exists(LOCK_FILE):
        try:
            with open(LOCK_FILE, "r") as f:
                pid = int(f.read().strip())
            if is_lclip_process(pid):
                os.kill(pid, signal.SIGKILL)
                try:
                    os.remove(LOCK_FILE)
                except OSError:
                    pass
                sys.exit(0)
            else:
                # Stale lock file
                try:
                    os.remove(LOCK_FILE)
                except OSError:
                    pass
        except Exception:
            # Stale lock file
            try:
                os.remove(LOCK_FILE)
            except OSError:
                pass

    # Save current PID to lock file
    try:
        with open(LOCK_FILE, "w") as f:
            f.write(str(os.getpid()))
    except Exception as e:
        print(f"Warning: could not write lock file: {e}", file=sys.stderr)

    # Launch UI
    from lclip.ui import LclipWindow
    app = QApplication(sys.argv)
    
    # Clean up lock file on exit
    def cleanup():
        try:
            if os.path.exists(LOCK_FILE):
                os.remove(LOCK_FILE)
        except OSError:
            pass
            
    app.aboutToQuit.connect(cleanup)
    
    # Initialize and show window
    window = LclipWindow()
    pos = QCursor.pos()
    
    # Center window at cursor
    window.move(pos.x() - window.width() // 2, pos.y() - 15)
    window.show()
    window.raise_()
    window.activateWindow()
    window.search_input.setFocus()
    
    # Run event loop
    ret = app.exec()
    cleanup()
    sys.exit(ret)

def start_daemon_if_not_running():
    # Check if daemon is already active by looking for a running process
    # Or just use the setsid daemonizer
    pass

def main():
    parser = argparse.ArgumentParser(description="Lclip - Glassmorphism Clipboard Manager & Symbol Picker")
    parser.add_argument("--daemon", action="store_true", help="Start the background daemon")
    parser.add_argument("--toggle", action="store_true", help="Toggle the Lclip panel UI")
    parser.add_argument("--clear", action="store_true", help="Clear the clipboard history")
    
    args = parser.parse_args()
    
    # Ensure cache directories exist
    os.makedirs(CACHE_DIR, exist_ok=True)
    os.makedirs(os.path.join(CACHE_DIR, "images"), exist_ok=True)
    
    if args.daemon:
        from lclip.daemon import LclipDaemon
        daemon = LclipDaemon()
        daemon.run()
    elif args.clear:
        # Clear JSON history file
        history_path = os.path.join(CACHE_DIR, "history.json")
        if os.path.exists(history_path):
            try:
                os.remove(history_path)
            except OSError:
                pass
        images_dir = os.path.join(CACHE_DIR, "images")
        if os.path.exists(images_dir):
            for f in os.listdir(images_dir):
                try:
                    os.remove(os.path.join(images_dir, f))
                except OSError:
                    pass
        print("Lclip clipboard history cleared.")
    else:
        # Toggles the UI directly in a fresh focused process
        # Check if the daemon is running; if not, spin it up in the background
        import subprocess
        # We check if lclip daemon is running
        try:
            res = subprocess.run(["pgrep", "-f", "lclip.main --daemon"], capture_output=True)
            if not res.stdout.strip():
                # Start daemon in background
                subprocess.Popen(
                    [sys.executable, "-m", "lclip.main", "--daemon"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    preexec_fn=os.setsid
                )
                # Wait briefly for daemon to initialize
                time.sleep(0.15)
        except Exception:
            pass
            
        run_ui()

if __name__ == "__main__":
    main()
