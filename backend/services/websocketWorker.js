import { parentPort, workerData } from 'worker_threads';
import { WebSocketServer } from 'ws';
import { Server } from 'http';

/**
 * WebSocket Worker Thread
 * Handles WebSocket connections in a separate thread
 */

let wss = null;
let metricsInterval = null;
let logsInterval = null;
let prevMetrics = null;
const clients = new Map();
let clientIdCounter = 0;

/**
 * Initialize WebSocket server in worker thread
 */
function initializeWebSocket() {
  try {
    // Create WebSocket server
    wss = new WebSocketServer({
      noServer: true,
      path: '/ws/monitoring'
    });

    wss.on('connection', (ws, request) => {
      const clientId = ++clientIdCounter;
      const clientInfo = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        ip: request.socket.remoteAddress,
        connectedAt: new Date().toISOString()
      };

      clients.set(clientId, clientInfo);

      console.log(`🔌 Monitoring client connected (ID: ${clientId})`);

      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to monitoring stream',
        clientId,
        timestamp: new Date().toISOString()
      }));

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          handleMessage(clientId, data);
        } catch (error) {
          console.error(`WebSocket client ${clientId} message error:`, error.message);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        console.log(`🔌 Monitoring client disconnected (ID: ${clientId})`);
        clients.delete(clientId);
        notifyMain({ type: 'client_disconnected', clientId });
      });

      ws.on('error', (error) => {
        console.error(`WebSocket client ${clientId} error:`, error.message);
        clients.delete(clientId);
        notifyMain({ type: 'client_error', clientId, error: error.message });
      });
    });

    // Start broadcasting
    startMetricsBroadcast();
    startLogsBroadcast();

    console.log('✅ WebSocket server initialized in worker thread');
    notifyMain({ type: 'initialized', port: workerData.port });

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket worker:', error.message);
    notifyMain({ type: 'error', error: error.message });
    return false;
  }
}

/**
 * Send message to main thread
 */
function notifyMain(message) {
  if (parentPort) {
    parentPort.postMessage(message);
  }
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  const { type, payload } = data;

  switch (type) {
    case 'subscribe':
      if (payload?.types) {
        payload.types.forEach(t => client.subscriptions.add(t));
      }
      sendToClient(clientId, {
        type: 'subscribed',
        types: Array.from(client.subscriptions)
      });
      break;

    case 'unsubscribe':
      if (client.subscriptions && payload?.types) {
        payload.types.forEach(t => client.subscriptions.delete(t));
      }
      break;

    case 'get_metrics':
      // Request metrics from main thread
      notifyMain({ type: 'request_metrics', clientId });
      break;

    case 'get_logs':
      // Request logs from main thread
      notifyMain({ 
        type: 'request_logs', 
        clientId, 
        limit: payload?.limit || 50,
        filter: payload?.filter
      });
      break;

    case 'get_suspicious':
      // Request suspicious activity from main thread
      notifyMain({ type: 'request_suspicious', clientId });
      break;

    default:
      sendToClient(clientId, {
        type: 'error',
        message: 'Unknown message type'
      });
  }
}

/**
 * Send message to specific client
 */
function sendToClient(clientId, data) {
  const client = clients.get(clientId);
  if (!client || client.ws.readyState !== 1) return;

  try {
    if (typeof data === 'object') {
      data = JSON.stringify(data);
    }
    client.ws.send(data);
  } catch (error) {
    console.error(`Send to client ${clientId} failed:`, error.message);
    clients.delete(clientId);
  }
}

/**
 * Broadcast message to all connected clients
 */
function broadcast(data, type) {
  if (clients.size === 0) return;

  const message = typeof data === 'object' 
    ? JSON.stringify(data) 
    : data;

  const deadClients = [];

  clients.forEach((client, clientId) => {
    // Check subscription
    if (client.subscriptions.size > 0 && !client.subscriptions.has(type)) {
      return;
    }

    if (client.ws.readyState === 1) { // WebSocket.OPEN
      try {
        client.ws.send(message);
      } catch (error) {
        console.error('Broadcast error:', error.message);
        deadClients.push(clientId);
      }
    } else {
      deadClients.push(clientId);
    }
  });

  // Clean up dead clients
  deadClients.forEach(clientId => {
    const client = clients.get(clientId);
    if (client) {
      client.ws.terminate();
      clients.delete(clientId);
    }
  });
}

/**
 * Start broadcasting system metrics every 2 seconds
 */
function startMetricsBroadcast() {
  metricsInterval = setInterval(() => {
    if (clients.size === 0) return;

    notifyMain({ type: 'get_metrics_delta' });
  }, 2000);

  console.log('📊 Metrics broadcast started (2s interval)');
}

/**
 * Start broadcasting access logs every 5 seconds
 */
function startLogsBroadcast() {
  logsInterval = setInterval(() => {
    if (clients.size === 0) return;

    notifyMain({ type: 'get_logs_data' });
  }, 5000);

  console.log('📋 Access logs broadcast started (5s interval)');
}

/**
 * Handle messages from main thread
 */
parentPort.on('message', (message) => {
  switch (message.type) {
    case 'handle_upgrade':
      // Handle WebSocket upgrade request
      const { request, socket, head } = message;
      const httpServer = new Server();
      httpServer.on('upgrade', (req, sock, hd) => {
        wss.handleUpgrade(req, sock, hd, (ws) => {
          wss.emit('connection', ws, req);
        });
      });
      httpServer.emit('upgrade', request, socket, head);
      break;

    case 'broadcast_metrics':
      broadcast({
        type: 'metrics',
        data: message.data,
        timestamp: new Date().toISOString()
      }, 'metrics');
      break;

    case 'broadcast_logs':
      broadcast({
        type: 'access_logs',
        data: message.data,
        timestamp: new Date().toISOString()
      }, 'access_logs');
      break;

    case 'send_to_client':
      sendToClient(message.clientId, message.data);
      break;

    case 'broadcast_firewall_event':
      broadcast({
        type: 'firewall_event',
        data: message.event,
        timestamp: new Date().toISOString()
      }, 'firewall_events');
      break;

    case 'broadcast_security_alert':
      broadcast({
        type: 'security_alert',
        data: message.alert,
        timestamp: new Date().toISOString()
      }, 'security_alerts');
      break;

    case 'get_client_count':
      parentPort.postMessage({
        type: 'client_count',
        count: clients.size
      });
      break;

    case 'shutdown':
      cleanup();
      break;
  }
});

/**
 * Cleanup and shutdown
 */
function cleanup() {
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
      client.ws.close();
    });
    clients.clear();

    wss.close();
    wss = null;
  }

  console.log('🛑 WebSocket worker stopped');
  parentPort.postMessage({ type: 'shutdown_complete' });
}

// Initialize on startup
initializeWebSocket();
