#!/bin/bash

echo "=== Debug WireGuard Peer Addition ==="

# Generate keys
echo "Generating keys..."
wg genkey > /tmp/test_privkey
wg pubkey < /tmp/test_privkey > /tmp/test_pubkey

echo "Private key saved to /tmp/test_privkey"
echo "Public key:"
cat /tmp/test_pubkey

PUBKEY=$(cat /tmp/test_pubkey)

echo ""
echo "Adding peer with IP 10.0.0.249..."
wg set wg0 peer "$PUBKEY" allowed-ips 10.0.0.249/32

echo ""
echo "Reloading config..."
wg-quick strip wg0 | wg setconf wg0 /dev/stdin

echo ""
echo "Current wg show output:"
wg show wg0

echo ""
echo "Current allowed-ips:"
wg show wg0 allowed-ips

echo ""
echo "Cleaning up..."
wg set wg0 peer "$PUBKEY" remove
wg-quick strip wg0 | wg setconf wg0 /dev/stdin

echo ""
echo "Final wg show:"
wg show wg0
