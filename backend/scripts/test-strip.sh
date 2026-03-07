#!/bin/bash

echo "=== Debug wg-quick strip ==="

# Generate keys
wg genkey > /tmp/test_privkey
wg pubkey < /tmp/test_privkey > /tmp/test_pubkey
PUBKEY=$(cat /tmp/test_pubkey)

echo "Adding peer..."
wg set wg0 peer "$PUBKEY" allowed-ips 10.0.0.249/32

echo ""
echo "wg show wg0:"
wg show wg0

echo ""
echo "wg showconf wg0:"
wg showconf wg0

echo ""
echo "wg-quick strip wg0:"
wg-quick strip wg0

echo ""
echo "Cleaning up..."
wg set wg0 peer "$PUBKEY" remove
wg-quick strip wg0 | wg setconf wg0 /dev/stdin
