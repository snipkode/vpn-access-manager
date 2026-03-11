# Backend Test Suite

Testing utilities for the VPN Access Backend monitoring system.

## Quick Start

```bash
# Navigate to backend directory
cd /root/vpn/backend

# Run test scenarios
node tests/test-runner.js [scenario]

# Run WebSocket client test
node tests/test-ws-client.js [duration]
```

## Test Scenarios

### 1. Test Runner - Simulate Traffic

```bash
# Run all scenarios (default)
node tests/test-runner.js

# Run specific scenarios
node tests/test-runner.js normal        # Normal traffic only
node tests/test-runner.js brute-force   # Brute force attack
node tests/test-runner.js port-scan     # Port scan activity
node tests/test-runner.js ddos          # DDoS pattern
node tests/test-runner.js mixed         # All scenarios combined
node tests/test-runner.js cleanup       # Clean up test data
```

### 2. WebSocket Client Test

```bash
# Test for 30 seconds (default)
node tests/test-ws-client.js

# Test for custom duration
node tests/test-ws-client.js 60  # 60 seconds
```

## Test Utilities

Import test utilities in your own test scripts:

```javascript
import {
  createNormalTraffic,
  createBruteForceAttack,
  createPortScanActivity,
  createDDoSPattern,
  createFirewallRules,
  cleanupTestData,
  generateRandomTraffic
} from './tests/testUtils.js';

// Example: Create brute force attack simulation
await createBruteForceAttack('198.51.100.99', 15);
```

## Test Scenarios Description

### Normal Traffic
Simulates legitimate user activity:
- Successful logins
- VPN connections
- API access
- Occasional failed login

### Brute Force Attack
Simulates credential stuffing/brute force:
- Multiple failed login attempts from same IP
- Rate limit triggered blocks
- Configurable attempt count

### Port Scan Activity
Simulates reconnaissance:
- Multiple port access attempts
- Different ports per scan
- Nmap user agent signature

### DDoS Pattern
Simulates denial of service:
- High volume requests from single IP
- Rapid API calls
- Configurable request count

### Mixed Traffic
Combines all scenarios for realistic testing:
1. Normal traffic baseline
2. Brute force attacks
3. Port scan activity
4. DDoS patterns

## WebSocket Monitoring Test

The WebSocket client test validates:

| Check | Description |
|-------|-------------|
| Connection | Successfully connects to `/ws/monitoring` |
| Subscription | Subscribes to all data types |
| Metrics | Receives system metrics every 2 seconds |
| Access Logs | Receives access logs every 5 seconds |
| Message Format | Validates message structure |
| Error Handling | Graceful error recovery |

## Expected Output

### Test Runner
```
🧪 ================================================================
🧪  VPN Monitoring Test Suite
🧪 ================================================================

📌 Running scenario: mixed

🟢 Scenario: Normal Traffic
✅ Created 5 access logs
✅ Created 10 access logs

🔴 Scenario: Brute Force Attack
✅ Created 15 access logs
✅ Created 8 access logs

🟡 Scenario: Port Scan Activity
✅ Created 6 access logs
✅ Created 5 access logs

🟣 Scenario: DDoS Pattern
✅ Created 50 access logs

📜 Creating test firewall rules...
✅ Created 3 firewall rules

⏳ Waiting for Firestore to index (2 seconds)...

📊 Test Results Summary
============================================================
📋 Total Access Logs: 50
🚨 Suspicious Activities: 3
🔥 Active Firewall Rules: 3

⚠️  Suspicious IPs Detected:
   1. 198.51.100.99 - Blocked: 15 - Risk: high
   2. 198.51.100.100 - Blocked: 8 - Risk: medium
   3. 203.0.113.50 - Blocked: 6 - Risk: medium
============================================================

✅ Test completed in 3.45s
```

### WebSocket Client
```
🔌 ================================================================
🔌  WebSocket Monitoring Client Test
🔌 ================================================================

📌 Server: ws://localhost:5000/ws/monitoring
📌 Duration: 30 seconds

✅ Connected to monitoring WebSocket

📩 [1] Received: connected
   Client ID: ::1:1773256789012
   Message: Connected to monitoring stream

📩 [2] Received: subscribed
   Types: metrics, access_logs, firewall_events, security_alerts

📩 [3] Received: metrics
   Memory: 3240MB / 7941MB

📩 [4] Received: access_logs
   Recent attempts: 20
   Suspicious activity: 3
   Active rules: 3
     ⚠️ 198.51.100.99 - Risk: high
     ⚠️ 198.51.100.100 - Risk: medium
     ⚠️ 203.0.113.50 - Risk: medium

...

📊 ================================================================
📊  Test Summary
📊 ================================================================

✅ Connection: Successful
⏱️  Duration: 30.05s
📨 Total Messages: 25
   📊 Metrics: 15
   📋 Access Logs: 6
   🚨 Firewall Events: 0
   ⚠️  Security Alerts: 0
❌ Errors: 0

📈 Message Rate: 0.83 msg/s

============================================================

✅ WebSocket test PASSED
```

## Cleanup

After testing, clean up test data:

```bash
node tests/test-runner.js cleanup
```

This removes:
- Test access logs (identified by metadata/user-agent)
- Test firewall rules (identified by name pattern)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WS_URL` | WebSocket server URL | `ws://localhost:5000/ws/monitoring` |

## Troubleshooting

### Connection Refused
```
❌ WebSocket error: connect ECONNREFUSED 127.0.0.1:5000
```
**Solution:** Ensure backend is running:
```bash
pm2 restart backdev
```

### No Messages Received
**Solution:** Check if broadcast intervals are running:
```bash
pm2 logs backdev | grep "broadcast started"
```

### Firestore Index Errors
```
FAILED_PRECONDITION: The query requires an index
```
**Solution:** Deploy indexes:
```bash
cd /root/vpn/backend
firebase deploy --only firestore:indexes
```

## Best Practices

1. **Always cleanup** after testing to avoid polluting production data
2. **Use test scenarios** in development/staging environments only
3. **Monitor backend logs** during tests for errors
4. **Run WebSocket tests** after deploying backend changes
5. **Test suspicious activity detection** with realistic attack patterns
