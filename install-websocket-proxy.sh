#!/bin/bash

################################################################################
# Install WebSocket Proxy Auto-Setup
# This script installs the WebSocket proxy setup to run automatically on boot
#
# Usage: sudo bash install-websocket-proxy.sh
################################################################################

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Install WebSocket Proxy Auto-Setup                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "✗ Please run as root (sudo bash install-websocket-proxy.sh)"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_SCRIPT="$SCRIPT_DIR/setup-websocket-proxy.sh"
AUTO_SETUP="$SCRIPT_DIR/auto-setup-websocket.sh"
SYSTEMD_SERVICE="$SCRIPT_DIR/websocket-proxy-setup.service"

# Make scripts executable
chmod +x "$SETUP_SCRIPT"
chmod +x "$AUTO_SETUP"

echo "✓ Made scripts executable"

# Copy auto-setup script to profile.d
cp "$AUTO_SETUP" /etc/profile.d/websocket-proxy-setup.sh
chmod +x /etc/profile.d/websocket-proxy-setup.sh

echo "✓ Installed auto-setup script to /etc/profile.d/"

# Install systemd service
cp "$SYSTEMD_SERVICE" /etc/systemd/system/websocket-proxy-setup.service

echo "✓ Installed systemd service"

# Reload systemd
systemctl daemon-reload

echo "✓ Reloaded systemd"

# Enable service
systemctl enable websocket-proxy-setup.service

echo "✓ Enabled WebSocket proxy setup service"

# Run setup now
echo ""
echo "Running initial setup..."
echo ""
bash "$SETUP_SCRIPT"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║   Installation Complete!                              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "WebSocket proxy will now:"
echo "  • Run automatically on system boot"
echo "  • Configure nginx before nginx starts"
echo "  • Only run once (idempotent)"
echo ""
echo "Manual setup: sudo bash /root/vpn/setup-websocket-proxy.sh"
echo "Logs: sudo journalctl -u websocket-proxy-setup"
echo ""
