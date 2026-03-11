#!/bin/bash

################################################################################
# Auto-start WebSocket Proxy Setup
# This script runs once on system startup to ensure WebSocket proxy is configured
# 
# Installation:
#   sudo cp /root/vpn/scripts/auto-setup-websocket.sh /etc/profile.d/
#   sudo chmod +x /etc/profile.d/auto-setup-websocket.sh
################################################################################

SETUP_MARKER="/var/run/websocket_proxy_setup.done"
SETUP_SCRIPT="/root/vpn/setup-websocket-proxy.sh"
LOG_FILE="/var/log/websocket_proxy_setup.log"

# Only run as root
if [ "$EUID" -ne 0 ]; then
    exit 0
fi

# Check if already setup
if [ -f "$SETUP_MARKER" ]; then
    # Check if nginx config still has WebSocket proxy
    if grep -q "location /ws/monitoring" /etc/nginx/sites-available/perumdati.tech 2>/dev/null; then
        exit 0
    fi
fi

# Log start
echo "$(date): Starting WebSocket proxy setup" >> "$LOG_FILE"

# Check if setup script exists
if [ -f "$SETUP_SCRIPT" ]; then
    # Run setup script non-interactively
    export DEBIAN_FRONTEND=noninteractive
    
    if bash "$SETUP_SCRIPT" >> "$LOG_FILE" 2>&1; then
        echo "$(date): WebSocket proxy setup completed successfully" >> "$LOG_FILE"
        touch "$SETUP_MARKER"
    else
        echo "$(date): WebSocket proxy setup failed" >> "$LOG_FILE"
    fi
else
    echo "$(date): Setup script not found at $SETUP_SCRIPT" >> "$LOG_FILE"
fi

exit 0
