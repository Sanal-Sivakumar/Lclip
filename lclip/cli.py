import socket
import sys
import os
import time
import subprocess

def send_command(command: str) -> bool:
    """Send a command string to the daemon via the Unix socket."""
    sock_path = os.path.expanduser("~/.cache/lclip/lclip.sock")
    if not os.path.exists(sock_path):
        return False
    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
            client.settimeout(1.0)
            client.connect(sock_path)
            client.sendall(command.encode("utf-8"))
            return True
    except Exception:
        return False

def start_daemon_and_toggle():
    """Start the daemon in the background and send the toggle command once ready."""
    # Run the daemon using the current python executable (or venv's python if active)
    # We use double fork/daemonize behavior by detaching using setsid
    python_exe = sys.executable
    cmd = [python_exe, "-m", "lclip.main", "--daemon"]
    
    subprocess.Popen(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        preexec_fn=os.setsid
    )
    
    # Wait for daemon to launch and create the socket
    for _ in range(30):
        time.sleep(0.1)
        if send_command("toggle"):
            return True
            
    print("Error: Could not establish communication with the Lclip daemon.", file=sys.stderr)
    return False
