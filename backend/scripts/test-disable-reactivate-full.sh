#!/bin/bash

# Comprehensive Disable/Reactivate Test
# Tests the complete flow: create -> disable -> reactivate -> remove

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Comprehensive Disable/Reactivate Test ===${NC}"
echo ""

# Generate test keypair
PRIVATE_KEY=$(wg genkey 2>/dev/null)
PUBLIC_KEY=$(echo "$PRIVATE_KEY" | wg pubkey 2>/dev/null)
TEST_IP="10.0.0.248"

echo "Test Configuration:"
echo "  Public Key: ${PUBLIC_KEY:0:30}..."
echo "  IP Address: $TEST_IP"
echo ""

# Test 1: Add peer (simulate device creation)
echo -e "${YELLOW}[Test 1] Adding peer (simulating device creation)...${NC}"
wg set wg0 peer "$PUBLIC_KEY" allowed-ips "$TEST_IP"/32
wg showconf wg0 > /etc/wireguard/wg0.conf

if wg show wg0 allowed-ips | grep -q "${PUBLIC_KEY:0:20}"; then
    echo -e "${GREEN}✓ PASS${NC}: Peer added to WireGuard"
else
    echo -e "${RED}✗ FAIL${NC}: Peer not found in WireGuard"
    exit 1
fi

if grep -q "$PUBLIC_KEY" /etc/wireguard/wg0.conf; then
    echo -e "${GREEN}✓ PASS${NC}: Peer saved to config file"
else
    echo -e "${RED}✗ FAIL${NC}: Peer not in config file"
    exit 1
fi
echo ""

# Test 2: Disable peer (remove from runtime, keep in config)
echo -e "${YELLOW}[Test 2] Disabling peer (remove from runtime only)...${NC}"
wg set wg0 peer "$PUBLIC_KEY" remove
# Do NOT save config - keep peer in config file for reactivation

if ! wg show wg0 allowed-ips | grep -q "${PUBLIC_KEY:0:20}"; then
    echo -e "${GREEN}✓ PASS${NC}: Peer removed from runtime"
else
    echo -e "${RED}✗ FAIL${NC}: Peer still in runtime"
    exit 1
fi

if grep -q "$PUBLIC_KEY" /etc/wireguard/wg0.conf; then
    echo -e "${GREEN}✓ PASS${NC}: Peer still in config file (for reactivation)"
else
    echo -e "${RED}✗ FAIL${NC}: Peer removed from config file"
    exit 1
fi
echo ""

# Test 3: Reactivate peer (add back to runtime and save)
echo -e "${YELLOW}[Test 3] Reactivating peer (add back to runtime)...${NC}"
wg set wg0 peer "$PUBLIC_KEY" allowed-ips "$TEST_IP"/32
wg showconf wg0 > /etc/wireguard/wg0.conf

if wg show wg0 allowed-ips | grep -q "${PUBLIC_KEY:0:20}"; then
    echo -e "${GREEN}✓ PASS${NC}: Peer back in runtime"
else
    echo -e "${RED}✗ FAIL${NC}: Peer not in runtime after reactivation"
    exit 1
fi

if grep -q "$PUBLIC_KEY" /etc/wireguard/wg0.conf; then
    echo -e "${GREEN}✓ PASS${NC}: Peer still in config file"
else
    echo -e "${RED}✗ FAIL${NC}: Peer not in config file"
    exit 1
fi
echo ""

# Test 4: Disable again (verify multiple disable/enable cycles work)
echo -e "${YELLOW}[Test 4] Disabling peer again (testing multiple cycles)...${NC}"
wg set wg0 peer "$PUBLIC_KEY" remove

if ! wg show wg0 allowed-ips | grep -q "${PUBLIC_KEY:0:20}"; then
    echo -e "${GREEN}✓ PASS${NC}: Peer disabled again successfully"
else
    echo -e "${RED}✗ FAIL${NC}: Peer still active"
    exit 1
fi
echo ""

# Test 5: Reactivate again
echo -e "${YELLOW}[Test 5] Reactivating peer again...${NC}"
wg set wg0 peer "$PUBLIC_KEY" allowed-ips "$TEST_IP"/32
wg showconf wg0 > /etc/wireguard/wg0.conf

if wg show wg0 allowed-ips | grep -q "${PUBLIC_KEY:0:20}"; then
    echo -e "${GREEN}✓ PASS${NC}: Peer reactivated again successfully"
else
    echo -e "${RED}✗ FAIL${NC}: Peer not in runtime"
    exit 1
fi
echo ""

# Test 6: Complete removal (revoke)
echo -e "${YELLOW}[Test 6] Removing peer completely (revoke)...${NC}"
wg set wg0 peer "$PUBLIC_KEY" remove
wg showconf wg0 > /etc/wireguard/wg0.conf

if ! wg show wg0 allowed-ips | grep -q "${PUBLIC_KEY:0:20}"; then
    echo -e "${GREEN}✓ PASS${NC}: Peer removed from runtime"
else
    echo -e "${RED}✗ FAIL${NC}: Peer still in runtime"
    exit 1
fi

if ! grep -q "$PUBLIC_KEY" /etc/wireguard/wg0.conf; then
    echo -e "${GREEN}✓ PASS${NC}: Peer removed from config file"
else
    echo -e "${RED}✗ FAIL${NC}: Peer still in config file"
    exit 1
fi
echo ""

# Final status
echo -e "${GREEN}=== All Tests Passed ===${NC}"
echo ""
echo "Summary:"
echo "  ✓ Peer creation (add to runtime + config)"
echo "  ✓ Peer disable (remove from runtime, keep in config)"
echo "  ✓ Peer reactivate (add back to runtime + config)"
echo "  ✓ Multiple disable/reactivate cycles"
echo "  ✓ Peer removal (remove from runtime + config)"
echo ""
echo "The disable/reactivate feature is working correctly!"
