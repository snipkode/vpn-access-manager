#!/bin/bash

# VPN Access Manager - Diagnostic Script
# Checks WireGuard interface, server status, and configuration

# Don't exit on error - we want to run all checks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WG_INTERFACE="${WG_INTERFACE:-wg0}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
WG_CONFIG_PATH="/etc/wireguard/wg0.conf"

# Counters
PASS=0
FAIL=0
WARN=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  VPN Access Manager - Diagnostic Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "PASS")
            echo -e "${GREEN}✓${NC} $message"
            ((PASS++))
            ;;
        "FAIL")
            echo -e "${RED}✗${NC} $message"
            ((FAIL++))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            ((WARN++))
            ;;
        "INFO")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
}

# Check 1: WireGuard interface active
echo -e "${YELLOW}[1/7] Checking WireGuard interface...${NC}"
if wg show "$WG_INTERFACE" > /dev/null 2>&1; then
    print_status "PASS" "WireGuard interface '$WG_INTERFACE' is active"
    
    # Show interface details
    wg show "$WG_INTERFACE" | grep -E "(public key|listening port)" | sed 's/^/    /'
else
    print_status "FAIL" "WireGuard interface '$WG_INTERFACE' not found"
fi
echo ""

# Check 2: Peers visible in allowed-ips
echo -e "${YELLOW}[2/7] Checking WireGuard peers...${NC}"
PEERS=$(wg show "$WG_INTERFACE" allowed-ips 2>/dev/null)
if [ -n "$PEERS" ] && [ "$(echo "$PEERS" | wc -l)" -gt 0 ]; then
    PEER_COUNT=$(echo "$PEERS" | wc -l)
    print_status "PASS" "Found $PEER_COUNT peer(s) in allowed-ips"
    echo "$PEERS" | sed 's/^/    /'
else
    print_status "WARN" "No peers configured in allowed-ips"
fi
echo ""

# Check 3: Config file exists
echo -e "${YELLOW}[3/7] Checking WireGuard config file...${NC}"
if [ -f "$WG_CONFIG_PATH" ]; then
    print_status "PASS" "Config file exists at $WG_CONFIG_PATH"
    
    # Check file permissions
    PERMS=$(stat -c %a "$WG_CONFIG_PATH" 2>/dev/null || stat -f %Lp "$WG_CONFIG_PATH" 2>/dev/null)
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "400" ]; then
        print_status "PASS" "Config file permissions are secure ($PERMS)"
    else
        print_status "WARN" "Config file permissions may be insecure ($PERMS), should be 600"
    fi
    
    # Check for [Interface] section
    if grep -q "\[Interface\]" "$WG_CONFIG_PATH"; then
        print_status "PASS" "Config has [Interface] section"
    else
        print_status "FAIL" "Config missing [Interface] section"
    fi
    
    # Check for [Peer] sections
    PEER_SECTIONS=$(grep -c "\[Peer\]" "$WG_CONFIG_PATH" 2>/dev/null || echo "0")
    PEER_SECTIONS=$(echo "$PEER_SECTIONS" | tr -d '[:space:]')
    if [ "$PEER_SECTIONS" -gt 0 ] 2>/dev/null; then
        print_status "PASS" "Config has $PEER_SECTIONS [Peer] section(s)"
    else
        print_status "INFO" "No [Peer] sections in config file"
    fi
else
    print_status "FAIL" "Config file not found at $WG_CONFIG_PATH"
fi
echo ""

# Check 4: Server running without errors
echo -e "${YELLOW}[4/7] Checking backend server...${NC}"
if curl -s --connect-timeout 2 "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
    print_status "PASS" "Backend server is responding on port $BACKEND_PORT"
elif curl -s --connect-timeout 2 "http://localhost:$BACKEND_PORT" > /dev/null 2>&1; then
    print_status "PASS" "Backend server is responding on port $BACKEND_PORT (no /health endpoint)"
else
    # Check if process is running
    if pgrep -f "node.*server.js" > /dev/null || pgrep -f "backend/server.js" > /dev/null; then
        print_status "WARN" "Server process exists but not responding on port $BACKEND_PORT"
    else
        print_status "FAIL" "Backend server not running on port $BACKEND_PORT"
    fi
fi

# Show server process info
SERVER_PROC=$(ps aux | grep -E "(node|next-server)" | grep -v grep | head -3)
if [ -n "$SERVER_PROC" ]; then
    echo -e "    ${BLUE}Server processes:${NC}"
    echo "$SERVER_PROC" | awk '{print "    " $11 " " $12}' | head -3
fi
echo ""

# Check 5: Generate endpoint exists
echo -e "${YELLOW}[5/7] Checking generate endpoint...${NC}"
# Test with POST since that's the required method
GENERATE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 -X POST "http://localhost:$BACKEND_PORT/api/vpn/generate" 2>/dev/null || echo "000")
if [ "$GENERATE_RESPONSE" = "404" ]; then
    print_status "FAIL" "Generate endpoint not found (404)"
elif [ "$GENERATE_RESPONSE" = "401" ] || [ "$GENERATE_RESPONSE" = "400" ]; then
    print_status "PASS" "Generate endpoint exists (requires auth: $GENERATE_RESPONSE)"
elif [ "$GENERATE_RESPONSE" = "000" ]; then
    print_status "FAIL" "Cannot reach generate endpoint (server not responding)"
else
    print_status "INFO" "Generate endpoint returned: $GENERATE_RESPONSE"
fi
echo ""

# Check 6: Database connectivity (Firebase)
echo -e "${YELLOW}[6/7] Checking environment configuration...${NC}"
if [ -f ".env" ]; then
    print_status "PASS" ".env file exists"
    
    # Check for required variables
    if grep -q "WG_SERVER_PRIVATE_KEY=" .env 2>/dev/null; then
        print_status "PASS" "WG_SERVER_PRIVATE_KEY configured"
    else
        print_status "WARN" "WG_SERVER_PRIVATE_KEY not found in .env"
    fi
    
    if grep -q "WG_SERVER_PUBLIC_KEY=" .env 2>/dev/null; then
        print_status "PASS" "WG_SERVER_PUBLIC_KEY configured"
    else
        print_status "WARN" "WG_SERVER_PUBLIC_KEY not found in .env"
    fi
    
    if grep -q "FIREBASE_PROJECT_ID=" .env 2>/dev/null; then
        print_status "PASS" "FIREBASE_PROJECT_ID configured"
    else
        print_status "WARN" "FIREBASE_PROJECT_ID not found in .env"
    fi
else
    print_status "WARN" ".env file not found in current directory"
fi
echo ""

# Check 7: System requirements
echo -e "${YELLOW}[7/7] Checking system requirements...${NC}"

# Check wg command
if command -v wg &> /dev/null; then
    print_status "PASS" "WireGuard tools installed (wg command available)"
else
    print_status "FAIL" "WireGuard tools not installed (wg command not found)"
fi

# Check wg-quick
if command -v wg-quick &> /dev/null; then
    print_status "PASS" "wg-quick command available"
else
    print_status "WARN" "wg-quick not found (may not be needed if interface is up)"
fi

# Check iptables
if command -v iptables &> /dev/null; then
    print_status "PASS" "iptables available for NAT"
else
    print_status "WARN" "iptables not found (NAT may not work)"
fi

# Check IP forwarding
if [ "$(cat /proc/sys/net/ipv4/ip_forward 2>/dev/null)" = "1" ]; then
    print_status "PASS" "IP forwarding enabled"
else
    print_status "WARN" "IP forwarding may not be enabled"
fi

# Check wg showconf (needed for peer persistence)
if wg showconf wg0 &> /dev/null; then
    print_status "PASS" "wg showconf available (peer persistence supported)"
else
    print_status "WARN" "wg showconf may not work (peer persistence may fail)"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Diagnostic Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed:${NC}   $PASS"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo -e "${RED}Failed:${NC}   $FAIL"
echo ""

TOTAL=$((PASS + FAIL + WARN))
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the output above.${NC}"
    exit 1
fi
