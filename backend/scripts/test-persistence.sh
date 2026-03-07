#!/bin/bash

echo "=== Test WireGuard Peer Persistence ==="

# Generate keys
echo "1. Generating keys..."
wg genkey > /tmp/test_privkey
wg pubkey < /tmp/test_privkey > /tmp/test_pubkey
PUBKEY=$(cat /tmp/test_pubkey)
echo "   Public Key: $PUBKEY"

# Show initial config
echo ""
echo "2. Initial config file:"
cat /etc/wireguard/wg0.conf | grep -A2 "\[Peer\]" || echo "   (no peers in config)"

# Show initial runtime
echo ""
echo "3. Initial runtime peers:"
wg show wg0 allowed-ips || echo "   (none)"

# Add peer
echo ""
echo "4. Adding peer with wg set..."
wg set wg0 peer "$PUBKEY" allowed-ips 10.0.0.249/32

# Show runtime after add
echo ""
echo "5. Runtime peers after wg set:"
wg show wg0 allowed-ips || echo "   (none)"

# Save config
echo ""
echo "6. Saving config with wg-quick strip..."
wg-quick strip wg0 > /etc/wireguard/wg0.conf.new
mv /etc/wireguard/wg0.conf.new /etc/wireguard/wg0.conf
chmod 600 /etc/wireguard/wg0.conf

# Show config after save
echo ""
echo "7. Config file after save:"
cat /etc/wireguard/wg0.conf | grep -A3 "\[Peer\]" || echo "   (no peers)"

# Reload and verify
echo ""
echo "8. Reloading config..."
wg-quick strip wg0 | wg setconf wg0 /dev/stdin

# Show runtime after reload
echo ""
echo "9. Runtime peers after reload:"
wg show wg0 allowed-ips || echo "   (none)"

# Remove peer
echo ""
echo "10. Removing peer..."
wg set wg0 peer "$PUBKEY" remove

# Save config again
echo ""
echo "11. Saving config after remove..."
wg-quick strip wg0 > /etc/wireguard/wg0.conf.new
mv /etc/wireguard/wg0.conf.new /etc/wireguard/wg0.conf
chmod 600 /etc/wireguard/wg0.conf

# Show config after remove
echo ""
echo "12. Config file after remove:"
cat /etc/wireguard/wg0.conf | grep -A3 "\[Peer\]" || echo "   (no peers)"

# Final runtime
echo ""
echo "13. Final runtime peers:"
wg show wg0 allowed-ips || echo "   (none)"

echo ""
echo "=== Test Complete ==="
