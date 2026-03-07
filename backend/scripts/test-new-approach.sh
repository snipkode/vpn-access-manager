#!/bin/bash

echo "=== Test Disable/Reactivate with Updated Service ==="

# Generate keys
wg genkey > /tmp/test_privkey
wg pubkey < /tmp/test_privkey > /tmp/test_pubkey
PUBKEY=$(cat /tmp/test_pubkey)
TEST_IP="10.0.0.249"

echo "Public Key: ${PUBKEY:0:30}..."
echo "IP: $TEST_IP"

# Show initial state
echo ""
echo "1. Initial state:"
echo "   Runtime peers:"
wg show wg0 allowed-ips || echo "   (none)"
echo "   Config peers:"
grep -A2 "\[Peer\]" /etc/wireguard/wg0.conf || echo "   (none)"

# Add peer
echo ""
echo "2. Adding peer..."
wg set wg0 peer "$PUBKEY" allowed-ips "$TEST_IP"/32
wg showconf wg0 > /etc/wireguard/wg0.conf
echo "   ✓ Peer added"

echo ""
echo "3. After add:"
echo "   Runtime:"
wg show wg0 allowed-ips
echo "   Config:"
grep -A2 "\[Peer\]" /etc/wireguard/wg0.conf || echo "   (none)"

# Disable peer (remove from runtime only)
echo ""
echo "4. Disabling peer (remove from runtime only)..."
wg set wg0 peer "$PUBKEY" remove
echo "   ✓ Peer disabled"

echo ""
echo "5. After disable:"
echo "   Runtime:"
wg show wg0 allowed-ips || echo "   (none)"
echo "   Config (peer should still be here):"
grep -A2 "\[Peer\]" /etc/wireguard/wg0.conf || echo "   (none)"

# Reactivate peer (add back to runtime and save)
echo ""
echo "6. Reactivating peer..."
wg set wg0 peer "$PUBKEY" allowed-ips "$TEST_IP"/32
wg showconf wg0 > /etc/wireguard/wg0.conf
echo "   ✓ Peer reactivated"

echo ""
echo "7. After reactivate:"
echo "   Runtime:"
wg show wg0 allowed-ips
echo "   Config:"
grep -A2 "\[Peer\]" /etc/wireguard/wg0.conf || echo "   (none)"

# Cleanup (remove completely)
echo ""
echo "8. Cleaning up (remove peer completely)..."
wg set wg0 peer "$PUBKEY" remove
wg showconf wg0 > /etc/wireguard/wg0.conf
echo "   ✓ Peer removed"

echo ""
echo "9. Final state:"
echo "   Runtime:"
wg show wg0 allowed-ips || echo "   (none)"
echo "   Config:"
grep -A2 "\[Peer\]" /etc/wireguard/wg0.conf || echo "   (none)"

echo ""
echo "=== Test Complete ==="
