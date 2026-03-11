import { WebSocketServer } from 'ws';

/**
 * Real-time Monitoring WebSocket Server
 * Broadcasts system metrics, access logs, and firewall events
 */

let wss = null;
let metricsInterval = null;
let logsInterval = null;
let prevMetrics = null;
const clients = new Set();

/**
 * Initialize WebSocket server for real-time monitoring
 * @param {Object} server - HTTP server to attach to
 */
export function initializeMonitoringWebSocket(server) {
  try {
    // Create WebSocket server with noServer: true to manually handle upgrades
    wss = new WebSocketServer({
      noServer: true,
      path: '/ws/monitoring'
    });

    // Handle upgrade request before Express intercepts it
    server.on('upgrade', (request, socket, head) => {
      const { pathname } = new URL(request.url, `http://${request.headers.host}`);

      if (pathname === '/ws/monitoring') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
      // Don't close socket for other paths - let Express handle them
    });

    wss.on('connection', (ws, request) => {
      const clientId = `${request.socket.remoteAddress}:${new Date().getTime()}`;
      console.log(`🔌 Monitoring client connected (${clientId})`);
      clients.add(ws);

      // Send initial data
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to monitoring stream',
        clientId,
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
        console.log(`🔌 Monitoring client disconnected (${clientId})`);
        clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error (${clientId}):`, error.message);
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
      ws.send(JSON.stringify({
        type: 'metrics',
        data: prevMetrics || {}
      }));
      break;

    case 'get_logs':
      // Logs are broadcasted automatically
      break;

    case 'get_suspicious':
      // Suspicious activity is included in logs broadcast
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
  // Import systemMetrics dynamically to avoid circular dependency
  import('./systemMetrics.js').then(({ getAllMetrics, getMetricsDelta }) => {
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
    }, 2000);

    console.log('📊 Metrics broadcast started (2s interval)');
  }).catch(error => {
    console.error('Failed to load systemMetrics:', error);
  });
}

/**
 * Cache for monitoring data to reduce Firestore reads
 */
const monitoringCache = {
  accessLogs: { data: [], timestamp: 0, ttl: 30000 }, // 30 seconds
  suspicious: { data: [], timestamp: 0, ttl: 60000 }, // 1 minute
  activeRules: { data: [], timestamp: 0, ttl: 30000 } // 30 seconds
};

/**
 * Get cached data if still valid
 */
function getCachedData(key) {
  const cache = monitoringCache[key];
  if (cache && Date.now() - cache.timestamp < cache.ttl) {
    return cache.data;
  }
  return null;
}

/**
 * Set cached data with timestamp
 */
function setCachedData(key, data) {
  monitoringCache[key] = {
    data,
    timestamp: Date.now(),
    ttl: monitoringCache[key].ttl
  };
}

/**
 * Start broadcasting access logs every 10 seconds (reduced from 5s)
 */
function startLogsBroadcast() {
  let lastLogCount = 0;
  let lastSuspiciousCount = 0;

  import('./accessMonitor.js').then(({ getRecentAccessAttempts, getSuspiciousActivity }) => {
    import('./firewall.js').then(({ getActiveRules }) => {
      logsInterval = setInterval(async () => {
        if (clients.size === 0) return;

        try {
          // Use cache to reduce Firestore reads
          let attempts = getCachedData('accessLogs');
          let suspicious = getCachedData('suspicious');
          let activeRules = getCachedData('activeRules');

          // Fetch fresh data if cache miss
          if (!attempts) {
            attempts = await getRecentAccessAttempts(20);
            setCachedData('accessLogs', attempts);
          }

          if (!suspicious) {
            suspicious = await getSuspiciousActivity();
            setCachedData('suspicious', suspicious);
          }

          if (!activeRules) {
            activeRules = await getActiveRules();
            setCachedData('activeRules', activeRules);
          }

          // Only broadcast if there are changes
          if (attempts.length !== lastLogCount || suspicious.length !== lastSuspiciousCount) {
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
            lastSuspiciousCount = suspicious.length;
          }
        } catch (error) {
          console.error('Logs broadcast error:', error.message);
        }
      }, 10000); // 10 seconds instead of 5

      console.log('📋 Access logs broadcast started (10s interval with caching)');
    }).catch(error => {
      console.error('Failed to load firewall:', error);
    });
  }).catch(error => {
    console.error('Failed to load accessMonitor:', error);
  });
}

/**
 * Set previous metrics (called from main thread)
 */
export function setPrevMetrics(metrics) {
  prevMetrics = metrics;
}

/**
 * Get previous metrics
 */
export function getPrevMetrics() {
  return prevMetrics;
}

/**
 * Broadcast message to all connected clients
 */
export function broadcast(message, type) {
  if (clients.size === 0) return;

  const deadClients = [];

  clients.forEach((client) => {
    if (client.subscriptions && !client.subscriptions.has(type)) {
      return;
    }

    if (client.readyState === 1) {
      try {
        client.send(message);
      } catch (error) {
        deadClients.push(client);
      }
    } else {
      deadClients.push(client);
    }
  });

  deadClients.forEach((client) => {
    clients.delete(client);
    client.terminate();
  });
}

/**
 * Broadcast firewall event
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
 */
export function getConnectedClientsCount() {
  return clients.size;
}
