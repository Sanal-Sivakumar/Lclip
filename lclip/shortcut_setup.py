import subprocess
import ast
import sys

def get_current_bindings():
    try:
        res = subprocess.run(
            ["gsettings", "get", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings"],
            capture_output=True, text=True, check=True
        )
        val = res.stdout.strip()
        if not val or val == "@as []" or val == "[]":
            return []
        # Safely evaluate string representation of list
        return ast.literal_eval(val)
    except Exception as e:
        print(f"Warning: could not read current keybindings: {e}", file=sys.stderr)
        return []

def set_bindings_list(bindings):
    val = "[" + ", ".join(f"'{p}'" for p in bindings) + "]"
    subprocess.run([
        "gsettings", "set", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings", val
    ], check=True)

def register_shortcut(name, command, binding):
    bindings = get_current_bindings()
    
    # 1. Check if a shortcut with this command and binding already exists
    for path in bindings:
        try:
            res_cmd = subprocess.run([
                "gsettings", "get", f"org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{path}", "command"
            ], capture_output=True, text=True)
            res_bind = subprocess.run([
                "gsettings", "get", f"org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{path}", "binding"
            ], capture_output=True, text=True)
            
            cmd_val = res_cmd.stdout.strip().strip("'")
            bind_val = res_bind.stdout.strip().strip("'")
            
            if cmd_val == command and bind_val == binding:
                # Update name and command (just in case they changed)
                subprocess.run([
                    "gsettings", "set", f"org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{path}", "name", name
                ])
                print(f"Shortcut '{name}' is already registered at {path}")
                return
        except Exception:
            pass
            
    # 2. Find the next available customX index
    idx = 0
    while True:
        candidate_path = f"/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom{idx}/"
        if candidate_path not in bindings:
            break
        idx += 1
        
    # Append path to bindings list
    bindings.append(candidate_path)
    set_bindings_list(bindings)
    
    # Configure the properties for this path
    subprocess.run([
        "gsettings", "set", f"org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{candidate_path}", "name", name
    ], check=True)
    subprocess.run([
        "gsettings", "set", f"org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{candidate_path}", "command", command
    ], check=True)
    subprocess.run([
        "gsettings", "set", f"org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{candidate_path}", "binding", binding
    ], check=True)
    
    print(f"Registered shortcut '{name}' at {candidate_path} with key {binding}")

def clean_old_custom_paths():
    """Removes our previous non-standard paths like lclip-period/lclip-semicolon/ from keybindings list."""
    bindings = get_current_bindings()
    cleaned = [p for p in bindings if "lclip-period" not in p and "lclip-semicolon" not in p]
    if len(cleaned) != len(bindings):
        set_bindings_list(cleaned)
        print("Cleaned legacy non-standard keybinding paths.")

def main():
    clean_old_custom_paths()
    register_shortcut("Lclip Toggle (Period)", "/home/sanal-sivakumar/.local/bin/lclip", "<Super>period")
    register_shortcut("Lclip Toggle (Semicolon)", "/home/sanal-sivakumar/.local/bin/lclip", "<Super>semicolon")

if __name__ == "__main__":
    main()
