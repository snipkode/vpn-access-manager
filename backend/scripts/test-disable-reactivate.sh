#!/bin/bash

echo "=== WireGuard Disable/Reactivate Peer Test ==="
echo ""

# Generate keypair
echo "1. Generating test keypair..."
PRIVATE_KEY=$(wg genkey)
PUBLIC_KEY=$(echo "$PRIVATE_KEY" | wg pubkey)
TEST_IP="10.0.0.249"
echo "   ✓ Keypair generated"
echo "   Public Key: ${PUBLIC_KEY:0:30}..."
echo "   IP Address: $TEST_IP"

# Show initial state
echo ""
echo "2. Initial WireGuard peers:"
INITIAL_PEERS=$(wg show wg0 allowed-ips 2>/dev/null)
if [ -n "$INITIAL_PEERS" ]; then
    echo "   $INITIAL_PEERS" | sed 's/^/   /'
else
    echo "   (no peers)"
fi

# Add peer (simulate creation)
echo ""
echo "3. Adding test peer (simulating creation)..."
wg set wg0 peer "$PUBLIC_KEY" allowed-ips "$TEST_IP"/32
wg-quick strip wg0 | wg setconf wg0 /dev/stdin
echo "   ✓ Peer added"

# Verify peer is active
echo ""
echo "4. Verifying peer is active..."
ACTIVE_PEERS=$(wg show wg0 allowed-ips 2>/dev/null)
if echo "$ACTIVE_PEERS" | grep -q "${PUBLIC_KEY:0:20}"; then
    echo "   ✓ Peer is active in WireGuard"
    echo "$ACTIVE_PEERS" | grep "${PUBLIC_KEY:0:20}" | sed 's/^/   /'
else
    echo "   ✗ Peer not found in WireGuard"
    exit 1
fi

# Disable peer (remove from WireGuard)
echo ""
echo "5. Disabling peer (remove from WireGuard)..."
wg set wg0 peer "$PUBLIC_KEY" remove
wg-quick strip wg0 | wg setconf wg0 /dev/stdin
echo "   ✓ Peer disabled"

# Verify peer is disabled
echo ""
echo "6. Verifying peer is disabled..."
DISABLED_PEERS=$(wg show wg0 allowed-ips 2>/dev/null)
if echo "$DISABLED_PEERS" | grep -q "${PUBLIC_KEY:0:20}"; then
    echo "   ✗ Peer still found in WireGuard"
    exit 1
else
    echo "   ✓ Peer is disabled (not in WireGuard)"
fi

# Reactivate peer (add back to WireGuard)
echo ""
echo "7. Reactivating peer (add back to WireGuard)..."
wg set wg0 peer "$PUBLIC_KEY" allowed-ips "$TEST_IP"/32
wg-quick strip wg0 | wg setconf wg0 /dev/stdin
echo "   ✓ Peer reactivated"

# Verify peer is reactivated
echo ""
echo "8. Verifying peer is reactivated..."
REACTIVATED_PEERS=$(wg show wg0 allowed-ips 2>/dev/null)
if echo "$REACTIVATED_PEERS" | grep -q "${PUBLIC_KEY:0:20}"; then
    echo "   ✓ Peer is reactivated in WireGuard"
    echo "$REACTIVATED_PEERS" | grep "${PUBLIC_KEY:0:20}" | sed 's/^/   /'
else
    echo "   ✗ Peer not found in WireGuard after reactivation"
    exit 1
fi

# Cleanup - remove test peer
echo ""
echo "9. Cleaning up test peer..."
wg set wg0 peer "$PUBLIC_KEY" remove
wg-quick strip wg0 | wg setconf wg0 /dev/stdin
echo "   ✓ Test peer removed"

# Final state
echo ""
echo "10. Final WireGuard peers:"
FINAL_PEERS=$(wg show wg0 allowed-ips 2>/dev/null)
if [ -n "$FINAL_PEERS" ]; then
    echo "$FINAL_PEERS" | sed 's/^/   /'
else
    echo "   (no peers)"
fi

echo ""
echo "=== Test Complete ==="
echo "✓ Disable/Reactivate functionality is working correctly!"
echo ""
echo "Summary:"
echo "   - Peer creation: ✓"
echo "   - Peer disable (remove from wg): ✓"
echo "   - Peer reactivate (add back to wg): ✓"
echo "   - Peer cleanup: ✓"
exit 0
