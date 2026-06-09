#!/bin/bash
# Lclip Setup and Configuration Script

set -e

WORKSPACE_DIR="/home/sanal-sivakumar/Documents/Lclip"
BIN_DIR="$HOME/.local/bin"
AUTOSTART_DIR="$HOME/.config/autostart"

echo "=== Lclip Setup starting ==="

# 1. Ensure local bin folder exists
mkdir -p "$BIN_DIR"

# 2. Check and try to install package dependencies
echo "Checking system package dependencies..."
DEPS=()
if ! command -v wl-paste &> /dev/null; then
    DEPS+=("wl-clipboard")
fi
if ! command -v xclip &> /dev/null; then
    DEPS+=("xclip")
fi
if ! command -v xdotool &> /dev/null; then
    DEPS+=("xdotool")
fi
if ! dpkg -l libxcb-cursor0 &> /dev/null; then
    DEPS+=("libxcb-cursor0")
fi

if [ ${#DEPS[@]} -gt 0 ]; then
    echo "Lclip requires the following system packages: ${DEPS[*]}"
    echo "Attempting to install them using apt (requires password-less sudo)..."
    if sudo -n true 2>/dev/null; then
        sudo apt update
        sudo apt install -y "${DEPS[@]}"
    else
        echo "Password required for sudo. Please run the following command in a terminal to install dependencies:"
        echo "  sudo apt update && sudo apt install -y ${DEPS[*]}"
        echo "Moving forward with environment setup..."
    fi
else
    echo "All system package dependencies are already installed."
fi

# 3. Create the launcher wrapper script
echo "Creating Lclip executable wrapper at $BIN_DIR/lclip..."
cat << 'EOF' > "$BIN_DIR/lclip"
#!/bin/bash
# Lclip executable wrapper
export PYTHONPATH="/home/sanal-sivakumar/Documents/Lclip"
WORKSPACE_DIR="/home/sanal-sivakumar/Documents/Lclip"
VENV_PYTHON="$WORKSPACE_DIR/.venv/bin/python3"

if [ ! -f "$VENV_PYTHON" ]; then
    echo "Error: Lclip virtual environment python not found at $VENV_PYTHON" >&2
    exit 1
fi

exec "$VENV_PYTHON" -m lclip.main "$@"
EOF

chmod +x "$BIN_DIR/lclip"

# 4. Create desktop autostart entry for the daemon
echo "Configuring Lclip daemon autostart..."
mkdir -p "$AUTOSTART_DIR"
cat << EOF > "$AUTOSTART_DIR/lclip.desktop"
[Desktop Entry]
Type=Application
Name=Lclip Daemon
Comment=Background daemon for Lclip Clipboard Manager
Exec=$BIN_DIR/lclip --daemon
Icon=edit-paste
Terminal=false
X-GNOME-Autostart-enabled=true
Categories=Utility;
EOF

# 5. Disable conflicting IBus emoji hotkeys
echo "Disabling conflicting GNOME/IBus emoji hotkeys..."
gsettings set org.freedesktop.ibus.panel.emoji hotkey "[]" || true

# 6. Configure global shortcuts in GNOME settings
echo "Configuring custom global keyboard shortcuts for Super+. and Super+; ..."
"$WORKSPACE_DIR/.venv/bin/python3" -m lclip.shortcut_setup

echo "=== Lclip Setup Completed Successfully ==="
echo "If dependencies were not installed due to password prompts, remember to run:"
echo "  sudo apt update && sudo apt install -y wl-clipboard xclip xdotool"
echo "You can now run Lclip directly by executing 'lclip' or using 'Super+.' / 'Super+;'"
