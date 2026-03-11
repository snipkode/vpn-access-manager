import { WebSocketServer } from 'ws';
import { getAllMetrics, getMetricsDelta } from './services/systemMetrics.js';
import { getRecentAccessAttempts, getSuspiciousActivity } from './services/accessMonitor.js';
import { getActiveRules } from './services/firewall.js';

/**
 * Real-time Monitoring WebSocket Server
 * Broadcasts system metrics, access logs, and firewall events
 */

let wss = null;
let metricsInterval = null;
let logsInterval = null;
let prevMetrics = null;

// Connected clients
const clients = new Set();

/**
 * Initialize WebSocket server for real-time monitoring
 * @param {Object} server - HTTP server to attach to
 */
export function initializeMonitoringWebSocket(server) {
  try {
    wss = new WebSocketServer({ 
      server,
      path: '/ws/monitoring'
    });

    wss.on('connection', (ws) => {
      console.log('🔌 Monitoring client connected');
      clients.add(ws);

      // Send initial data
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to monitoring stream',
        timestamp: new Date().toISOString()
      }));

      // Handle client messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        console.log('🔌 Monitoring client disconnected');
        clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
      });
    });

    // Start broadcasting metrics
    startMetricsBroadcast();
    startLogsBroadcast();

    console.log('✅ Monitoring WebSocket server initialized');
    return wss;
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket server:', error.message);
    return null;
  }
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(ws, data) {
  const { type, payload } = data;

  switch (type) {
    case 'subscribe':
      // Client subscribes to specific data types
      ws.subscriptions = ws.subscriptions || new Set();
      if (payload?.types) {
        payload.types.forEach(t => ws.subscriptions.add(t));
      }
      ws.send(JSON.stringify({
        type: 'subscribed',
        types: Array.from(ws.subscriptions)
      }));
      break;

    case 'unsubscribe':
      if (ws.subscriptions && payload?.types) {
        payload.types.forEach(t => ws.subscriptions.delete(t));
      }
      break;

    case 'get_metrics':
      // Send immediate metrics
      const metrics = getAllMetrics();
      ws.send(JSON.stringify({
        type: 'metrics',
        data: metrics
      }));
      break;

    case 'get_logs':
      // Send recent access logs
      getRecentAccessAttempts(payload?.limit || 50, payload?.filter)
        .then(attempts => {
          ws.send(JSON.stringify({
            type: 'access_logs',
            data: attempts
          }));
        });
      break;

    case 'get_suspicious':
      // Send suspicious activity
      getSuspiciousActivity()
        .then(suspicious => {
          ws.send(JSON.stringify({
            type: 'suspicious_activity',
            data: suspicious
          }));
        });
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type'
      }));
  }
}

/**
 * Start broadcasting system metrics every 2 seconds
 */
function startMetricsBroadcast() {
  // Initial metrics
  prevMetrics = getAllMetrics();

  metricsInterval = setInterval(() => {
    if (clients.size === 0) return;

    try {
      const metrics = getMetricsDelta(prevMetrics);
      prevMetrics = metrics;

      const message = JSON.stringify({
        type: 'metrics',
        data: metrics,
        timestamp: new Date().toISOString()
      });

      broadcast(message, 'metrics');
    } catch (error) {
      console.error('Metrics broadcast error:', error);
    }
  }, 2000); // Every 2 seconds

  console.log('📊 Metrics broadcast started (2s interval)');
}

/**
 * Start broadcasting access logs every 5 seconds
 */
function startLogsBroadcast() {
  let lastLogCount = 0;

  logsInterval = setInterval(async () => {
    if (clients.size === 0) return;

    try {
      const [attempts, suspicious, activeRules] = await Promise.all([
        getRecentAccessAttempts(20),
        getSuspiciousActivity(),
        getActiveRules()
      ]);

      // Only broadcast if there are new logs
      if (attempts.length !== lastLogCount || suspicious.length > 0) {
        const message = JSON.stringify({
          type: 'access_logs',
          data: {
            recent_attempts: attempts,
            suspicious_activity: suspicious,
            active_rules_count: activeRules.length
          },
          timestamp: new Date().toISOString()
        });

        broadcast(message, 'access_logs');
        lastLogCount = attempts.length;
      }
    } catch (error) {
      console.error('Logs broadcast error:', error);
    }
  }, 5000); // Every 5 seconds

  console.log('📋 Access logs broadcast started (5s interval)');
}

/**
 * Broadcast message to all connected clients
 * @param {string} message - JSON string message
 * @param {string} type - Message type for filtering
 */
function broadcast(message, type) {
  if (clients.size === 0) return;

  const deadClients = [];

  clients.forEach((client) => {
    // Check if client is subscribed to this type
    if (client.subscriptions && !client.subscriptions.has(type)) {
      return;
    }

    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
      } catch (error) {
        console.error('Broadcast error:', error);
        deadClients.push(client);
      }
    } else {
      deadClients.push(client);
    }
  });

  // Clean up dead clients
  deadClients.forEach((client) => {
    clients.delete(client);
    client.terminate();
  });
}

/**
 * Broadcast firewall event
 * @param {Object} event - Firewall event data
 */
export function broadcastFirewallEvent(event) {
  if (!wss || clients.size === 0) return;

  const message = JSON.stringify({
    type: 'firewall_event',
    data: event,
    timestamp: new Date().toISOString()
  });

  broadcast(message, 'firewall_events');
}

/**
 * Broadcast security alert
 * @param {Object} alert - Security alert data
 */
export function broadcastSecurityAlert(alert) {
  if (!wss || clients.size === 0) return;

  const message = JSON.stringify({
    type: 'security_alert',
    data: alert,
    timestamp: new Date().toISOString()
  });

  broadcast(message, 'security_alerts');
}

/**
 * Stop WebSocket server and cleanup intervals
 */
export function stopMonitoringWebSocket() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }

  if (logsInterval) {
    clearInterval(logsInterval);
    logsInterval = null;
  }

  if (wss) {
    clients.forEach((client) => {
      client.close();
    });
    clients.clear();
    
    wss.close();
    wss = null;
  }

  console.log('🛑 Monitoring WebSocket server stopped');
}

/**
 * Get connected clients count
 * @returns {number} Number of connected clients
 */
export function getConnectedClientsCount() {
  return clients.size;
}
