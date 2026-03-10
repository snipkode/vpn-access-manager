#!/bin/bash

# ===========================================
# Stunnel Setup Script for VPN API
# ===========================================
# This script installs and configures stunnel
# to forward port 445 to API port 5000
# ===========================================

set -e

echo "🔧 Setting up stunnel for VPN API..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (sudo ./setup-stunnel.sh)"
  exit 1
fi

# Detect OS
if [ -f /etc/debian_version ]; then
  OS="debian"
  echo "✅ Detected Debian/Ubuntu"
elif [ -f /etc/redhat-release ]; then
  OS="redhat"
  echo "✅ Detected RedHat/CentOS"
else
  echo "❌ Unsupported OS"
  exit 1
fi

# Install stunnel
echo "📦 Installing stunnel..."
if [ "$OS" = "debian" ]; then
  apt-get update
  apt-get install -y stunnel4
elif [ "$OS" = "redhat" ]; then
  yum install -y stunnel
fi

# Create stunnel directory
echo "📁 Creating configuration directory..."
mkdir -p /etc/stunnel
mkdir -p /root/vpn/backend/stunnel

# Copy configuration
echo "📋 Copying configuration..."
cp /root/vpn/backend/stunnel/stunnel.conf /etc/stunnel/stunnel.conf

# Enable stunnel service
echo "⚙️ Enabling stunnel service..."
if [ "$OS" = "debian" ]; then
  # Edit /etc/default/stunnel4 to enable
  sed -i 's/ENABLED=0/ENABLED=1/' /etc/default/stunnel4
fi

# Generate self-signed certificate (optional, for SSL)
echo "🔐 Generating SSL certificate (optional)..."
if [ ! -f /etc/stunnel/stunnel.pem ]; then
  openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
    -subj "/C=ID/ST=Indonesia/L=Jakarta/O=VPN Access/CN=localhost" \
    -keyout /etc/stunnel/stunnel.key \
    -out /etc/stunnel/stunnel.crt
  
  # Combine cert and key
  cat /etc/stunnel/stunnel.crt /etc/stunnel/stunnel.key > /etc/stunnel/stunnel.pem
  chmod 600 /etc/stunnel/stunnel.pem
  echo "✅ SSL certificate generated"
else
  echo "ℹ️ SSL certificate already exists"
fi

# Set permissions
chmod 644 /etc/stunnel/stunnel.conf
chmod 600 /etc/stunnel/stunnel.pem 2>/dev/null || true

# Start stunnel service
echo "🚀 Starting stunnel service..."
systemctl enable stunnel4 2>/dev/null || systemctl enable stunnel 2>/dev/null || true
systemctl restart stunnel4 2>/dev/null || systemctl restart stunnel 2>/dev/null || true

# Wait for service to start
sleep 2

# Check status
echo "📊 Checking stunnel status..."
if systemctl is-active --quiet stunnel4 2>/dev/null || systemctl is-active --quiet stunnel 2>/dev/null; then
  echo "✅ stunnel is running"
else
  echo "⚠️ stunnel may not be running. Check logs with: journalctl -u stunnel4 -f"
fi

# Verify port forwarding
echo "🔍 Verifying port forwarding..."
if netstat -tlnp 2>/dev/null | grep -q ":445" || ss -tlnp 2>/dev/null | grep -q ":445"; then
  echo "✅ Port 445 is listening"
else
  echo "⚠️ Port 445 is not listening. Check configuration."
fi

# Show configuration
echo ""
echo "============================================"
echo "✅ Stunnel Setup Complete!"
echo "============================================"
echo ""
echo "Configuration:"
echo "  - Accept:  port 445"
echo "  - Connect: port 5000 (VPN API)"
echo "  - Config:  /etc/stunnel/stunnel.conf"
echo ""
echo "Commands:"
echo "  - Start:   sudo systemctl start stunnel4"
echo "  - Stop:    sudo systemctl stop stunnel4"
echo "  - Restart: sudo systemctl restart stunnel4"
echo "  - Status:  sudo systemctl status stunnel4"
echo "  - Logs:    sudo journalctl -u stunnel4 -f"
echo ""
echo "Test:"
echo "  curl http://localhost:445/health"
echo "  (Should forward to localhost:5000/health)"
echo ""
echo "============================================"
