#!/usr/bin/env node
/**
 * WebSocket Monitoring Client Test
 * Connects to monitoring WebSocket and validates real-time broadcasts
 * 
 * Usage: node tests/test-ws-client.js [duration]
 * 
 * Options:
 *   duration - Test duration in seconds (default: 30)
 */

import WebSocket from 'ws';

const WS_URL = process.env.WS_URL || 'ws://localhost:5000/ws/monitoring';
const DURATION = parseInt(process.argv[2]) || 30;

// Test statistics
const stats = {
  connected: false,
  messagesReceived: 0,
  metricsCount: 0,
  accessLogsCount: 0,
  firewallEventsCount: 0,
  securityAlertsCount: 0,
  errors: [],
  startTime: null,
  endTime: null
};

/**
 * Validate metrics message
 */
function validateMetrics(data) {
  const issues = [];
  
  if (!data.data) {
    issues.push('Missing data field');
  } else {
    // Check for expected metrics fields
    if (!data.data.cpu && !data.data.memory) {
      issues.push('Missing cpu and memory metrics');
    }
  }
  
  return issues;
}

/**
 * Validate access logs message
 */
function validateAccessLogs(data) {
  const issues = [];
  
  if (!data.data) {
    issues.push('Missing data field');
  } else {
    if (!Array.isArray(data.data.recent_attempts)) {
      issues.push('recent_attempts is not an array');
    }
    if (!Array.isArray(data.data.suspicious_activity)) {
      issues.push('suspicious_activity is not an array');
    }
    if (typeof data.data.active_rules_count !== 'number') {
      issues.push('active_rules_count is not a number');
    }
  }
  
  return issues;
}

/**
 * Print message details
 */
function printMessageDetails(type, data) {
  switch (type) {
    case 'connected':
      console.log(`   Client ID: ${data.clientId || 'N/A'}`);
      console.log(`   Message: ${data.message}`);
      break;
      
    case 'subscribed':
      console.log(`   Types: ${data.types?.join(', ') || 'N/A'}`);
      break;
      
    case 'metrics':
      stats.metricsCount++;
      if (data.data?.memory) {
        const usedMB = Math.round(data.data.memory.used / 1024 / 1024);
        const totalMB = Math.round(data.data.memory.total / 1024 / 1024);
        console.log(`   Memory: ${usedMB}MB / ${totalMB}MB`);
      }
      break;
      
    case 'access_logs':
      stats.accessLogsCount++;
      if (data.data) {
        console.log(`   Recent attempts: ${data.data.recent_attempts?.length || 0}`);
        console.log(`   Suspicious activity: ${data.data.suspicious_activity?.length || 0}`);
        console.log(`   Active rules: ${data.data.active_rules_count || 0}`);
        
        if (data.data.suspicious_activity?.length > 0) {
          data.data.suspicious_activity.forEach(activity => {
            console.log(`     ⚠️ ${activity.ip} - Risk: ${activity.risk_level}`);
          });
        }
      }
      break;
      
    case 'firewall_event':
      stats.firewallEventsCount++;
      console.log(`   Event: ${data.data?.event_type || 'N/A'}`);
      break;
      
    case 'security_alert':
      stats.securityAlertsCount++;
      console.log(`   Alert: ${data.data?.message || 'N/A'}`);
      break;
  }
}

/**
 * Run WebSocket test
 */
async function runWebSocketTest() {
  console.log('\n🔌 ' + '='.repeat(56));
  console.log('🔌  WebSocket Monitoring Client Test');
  console.log('🔌 ' + '='.repeat(56));
  console.log(`\n📌 Server: ${WS_URL}`);
  console.log(`📌 Duration: ${DURATION} seconds\n`);
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    
    stats.startTime = new Date();
    
    ws.on('open', () => {
      console.log('✅ Connected to monitoring WebSocket\n');
      stats.connected = true;
      
      // Subscribe to all data types
      ws.send(JSON.stringify({
        type: 'subscribe',
        payload: {
          types: ['metrics', 'access_logs', 'firewall_events', 'security_alerts']
        }
      }));
    });
    
    ws.on('message', (data) => {
      stats.messagesReceived++;
      
      try {
        const message = JSON.parse(data.toString());
        stats.messagesReceived++;
        
        console.log(`📩 [${stats.messagesReceived}] Received: ${message.type}`);
        
        // Validate message
        let issues = [];
        if (message.type === 'metrics') {
          issues = validateMetrics(message);
        } else if (message.type === 'access_logs') {
          issues = validateAccessLogs(message);
        }
        
        if (issues.length > 0) {
          console.log(`   ⚠️  Validation issues: ${issues.join(', ')}`);
          stats.errors.push(...issues);
        }
        
        // Print details
        printMessageDetails(message.type, message);
        console.log('');
        
      } catch (error) {
        console.error(`❌ Parse error: ${error.message}\n`);
        stats.errors.push(`Parse error: ${error.message}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      stats.errors.push(`Connection error: ${error.message}`);
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('\n🔌 Disconnected from monitoring WebSocket');
    });
    
    // End test after duration
    setTimeout(() => {
      stats.endTime = new Date();
      
      if (ws.readyState === WebSocket.OPEN) {
        console.log('\n⏳ Test duration completed, disconnecting...\n');
        ws.close();
      }
      
      resolve();
    }, DURATION * 1000);
  });
}

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n📊 ' + '='.repeat(56));
  console.log('📊  Test Summary');
  console.log('📊 ' + '='.repeat(56));
  
  const duration = stats.endTime && stats.startTime 
    ? ((stats.endTime - stats.startTime) / 1000).toFixed(2)
    : 'N/A';
  
  console.log(`\n✅ Connection: ${stats.connected ? 'Successful' : 'Failed'}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📨 Total Messages: ${stats.messagesReceived}`);
  console.log(`   📊 Metrics: ${stats.metricsCount}`);
  console.log(`   📋 Access Logs: ${stats.accessLogsCount}`);
  console.log(`   🚨 Firewall Events: ${stats.firewallEventsCount}`);
  console.log(`   ⚠️  Security Alerts: ${stats.securityAlertsCount}`);
  console.log(`❌ Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n⚠️  Error Details:');
    stats.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }
  
  // Calculate message rate
  if (stats.messagesReceived > 0 && duration > 0) {
    const rate = (stats.messagesReceived / parseFloat(duration)).toFixed(2);
    console.log(`\n📈 Message Rate: ${rate} msg/s`);
  }
  
  console.log('\n' + '='.repeat(56));
  
  // Determine test result
  const passed = stats.connected && 
                 stats.metricsCount > 0 && 
                 stats.accessLogsCount > 0 &&
                 stats.errors.length === 0;
  
  if (passed) {
    console.log('\n✅ WebSocket test PASSED\n');
  } else {
    console.log('\n❌ WebSocket test FAILED\n');
  }
  
  return passed;
}

// Run test
runWebSocketTest()
  .then(() => {
    const passed = printSummary();
    process.exit(passed ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error.message);
    printSummary();
    process.exit(1);
  });
