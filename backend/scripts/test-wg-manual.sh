#!/bin/bash

echo "=== Manual WireGuard Peer Test ==="
echo ""

# Generate keypair
echo "1. Generating keypair..."
PRIVATE_KEY=$(wg genkey)
PUBLIC_KEY=$(echo "$PRIVATE_KEY" | wg pubkey)
echo "   Public Key: ${PUBLIC_KEY:0:30}..."

# Show current peers
echo ""
echo "2. Current peers before:"
wg show wg0 allowed-ips || echo "   (none)"

# Add peer
echo ""
echo "3. Adding peer with IP 10.0.0.250..."
wg set wg0 peer "$PUBLIC_KEY" allowed-ips 10.0.0.250/32
echo "   Peer added via wg set"

# Verify
echo ""
echo "4. Current peers after:"
wg show wg0 allowed-ips || echo "   (none)"

echo ""
echo "5. Full wg show output:"
wg show wg0

# Cleanup
echo ""
echo "6. Removing test peer..."
wg set wg0 peer "$PUBLIC_KEY" remove
echo "   Peer removed"

echo ""
echo "7. Final peers:"
wg show wg0 allowed-ips || echo "   (none)"

echo ""
echo "=== Test Complete ==="
