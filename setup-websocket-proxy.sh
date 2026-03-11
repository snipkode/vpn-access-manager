#!/bin/bash

################################################################################
# WebSocket Proxy Setup Script for Nginx
# This script configures Nginx to proxy WebSocket connections to the backend
# 
# Usage: sudo bash setup-websocket-proxy.sh
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NGINX_CONFIG="/etc/nginx/sites-available/perumdati.tech"
NGINX_LINK="/etc/nginx/sites-enabled/perumdati.tech"
BACKEND_PORT="5000"
WEBSOCKET_PATH="/ws/monitoring"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   WebSocket Proxy Setup for Nginx                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}✗ Please run as root (sudo bash setup-websocket-proxy.sh)${NC}"
  exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}✗ Nginx is not installed. Please install nginx first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Nginx is installed${NC}"

# Check if nginx config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${YELLOW}⚠ Nginx config not found at $NGINX_CONFIG${NC}"
    echo -e "${YELLOW}  Creating new config...${NC}"
    
    cat > "$NGINX_CONFIG" << 'EOF'
server {
    listen 80;
    server_name perumdati.tech;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 445 ssl;
    server_name perumdati.tech;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/perumdati.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/perumdati.tech/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /uploads/ {
        alias /root/vpn/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for Next.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket Proxy for Real-time Monitoring
    location /ws/monitoring {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        
        # WebSocket specific settings
        proxy_buffering off;
        proxy_cache off;
        proxy_chunked_encoded off;
    }
}
EOF
    
    echo -e "${GREEN}✓ Created new nginx config at $NGINX_CONFIG${NC}"
else
    echo -e "${GREEN}✓ Found existing nginx config${NC}"
    
    # Check if WebSocket proxy already exists
    if grep -q "location /ws/monitoring" "$NGINX_CONFIG"; then
        echo -e "${YELLOW}⚠ WebSocket proxy already configured!${NC}"
        echo -e "${YELLOW}  Do you want to update it? (y/n)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}  Updating WebSocket proxy configuration...${NC}"
        else
            echo -e "${YELLOW}  Skipping configuration update.${NC}"
            exit 0
        fi
    fi
    
    # Backup existing config
    cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓ Backed up existing config${NC}"
    
    # Check if we need to add WebSocket proxy to existing config
    if ! grep -q "location /ws/monitoring" "$NGINX_CONFIG"; then
        echo -e "${BLUE}  Adding WebSocket proxy to existing config...${NC}"
        
        # Find the last location block and add WebSocket proxy after it
        # We'll add it before the closing brace of the server block
        temp_file=$(mktemp)
        
        # Read the config and insert WebSocket proxy before the last closing brace
        awk '
        BEGIN { found_server = 0; added = 0 }
        /^server \{/ { found_server = 1 }
        found_server && /^}$/ && !added {
            # Print WebSocket config before closing brace
            print ""
            print "    # WebSocket Proxy for Real-time Monitoring"
            print "    location /ws/monitoring {"
            print "        proxy_pass http://localhost:5000;"
            print "        proxy_http_version 1.1;"
            print "        proxy_set_header Upgrade $http_upgrade;"
            print "        proxy_set_header Connection \"upgrade\";"
            print "        proxy_set_header Host $host;"
            print "        proxy_set_header X-Real-IP $remote_addr;"
            print "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"
            print "        proxy_set_header X-Forwarded-Proto $scheme;"
            print "        proxy_read_timeout 86400;"
            print "        proxy_buffering off;"
            print "        proxy_cache off;"
            print "    }"
            print ""
            added = 1
        }
        { print }
        ' "$NGINX_CONFIG" > "$temp_file"
        
        mv "$temp_file" "$NGINX_CONFIG"
        echo -e "${GREEN}✓ Added WebSocket proxy configuration${NC}"
    fi
fi

# Check if symlink exists
if [ ! -L "$NGINX_LINK" ]; then
    echo -e "${BLUE}  Creating symlink...${NC}"
    ln -sf "$NGINX_CONFIG" "$NGINX_LINK"
    echo -e "${GREEN}✓ Created symlink${NC}"
fi

# Test nginx configuration
echo -e "${BLUE}  Testing nginx configuration...${NC}"
if nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✓ Nginx configuration syntax is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration has errors!${NC}"
    nginx -t
    echo -e "${YELLOW}  Restoring backup...${NC}"
    # Find the most recent backup
    latest_backup=$(ls -t ${NGINX_CONFIG}.backup.* 2>/dev/null | head -1)
    if [ -n "$latest_backup" ]; then
        cp "$latest_backup" "$NGINX_CONFIG"
        echo -e "${GREEN}✓ Restored backup${NC}"
    fi
    exit 1
fi

# Reload nginx
echo -e "${BLUE}  Reloading nginx...${NC}"
if systemctl reload nginx; then
    echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}✗ Failed to reload nginx${NC}"
    exit 1
fi

# Verify WebSocket proxy is working
echo ""
echo -e "${BLUE}  Testing WebSocket proxy...${NC}"
sleep 2

# Check if nginx is listening on port 445
if netstat -tlnp 2>/dev/null | grep -q ":445" || ss -tlnp 2>/dev/null | grep -q ":445"; then
    echo -e "${GREEN}✓ Nginx is listening on port 445${NC}"
else
    echo -e "${YELLOW}⚠ Nginx may not be listening on port 445${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   WebSocket Proxy Setup Complete!                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  • WebSocket Endpoint: wss://perumdati.tech:445/ws/monitoring"
echo "  • Backend: http://localhost:${BACKEND_PORT}"
echo "  • Config File: $NGINX_CONFIG"
echo ""
echo -e "${BLUE}Test Connection:${NC}"
echo "  1. Open browser console"
echo "  2. Run:"
echo "     const ws = new WebSocket('wss://perumdati.tech:445/ws/monitoring');"
echo "     ws.onopen = () => console.log('✅ Connected!');"
echo "     ws.onmessage = (e) => console.log('📩 Data:', JSON.parse(e.data));"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo "  • Nginx: sudo tail -f /var/log/nginx/access.log"
echo "  • Backend: pm2 logs backdev"
echo ""
echo -e "${YELLOW}Note: It may take a few seconds for the changes to take effect.${NC}"
echo ""
