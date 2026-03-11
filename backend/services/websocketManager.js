import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getAllMetrics, getMetricsDelta } from './systemMetrics.js';
import { getRecentAccessAttempts, getSuspiciousActivity } from './accessMonitor.js';
import { getActiveRules } from './firewall.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * WebSocket Worker Manager
 * Manages WebSocket connections in a separate worker thread
 */

let worker = null;
let isReady = false;
let pendingUpgrades = [];

/**
 * Initialize WebSocket worker thread
 * @param {Object} server - HTTP server for upgrade handling
 * @returns {Worker}
 */
export function initializeWebSocketWorker(server) {
  try {
    const workerPath = join(__dirname, 'websocketWorker.js');
    
    worker = new Worker(workerPath, {
      workerData: { port: server.address()?.port || 5000 },
      env: process.env
    });

    // Handle worker messages
    worker.on('message', (message) => {
      handleWorkerMessage(message, server);
    });

    worker.on('error', (error) => {
      console.error('❌ WebSocket worker error:', error);
    });

    worker.on('exit', (code) => {
      console.error(`🛑 WebSocket worker exited with code: ${code}`);
      isReady = false;
    });

    console.log('🔧 WebSocket worker thread starting...');
    return worker;
  } catch (error) {
    console.error('❌ Failed to create WebSocket worker:', error.message);
    return null;
  }
}

/**
 * Handle messages from worker thread
 */
function handleWorkerMessage(message, server) {
  switch (message.type) {
    case 'initialized':
      console.log(`✅ WebSocket worker initialized on port ${message.port}`);
      isReady = true;
      // Process pending upgrades
      pendingUpgrades.forEach(({ request, socket, head }) => {
        sendUpgradeToWorker(request, socket, head);
      });
      pendingUpgrades = [];
      break;

    case 'request_metrics':
      // Get metrics and send to worker
      const metrics = getAllMetrics();
      sendToWorker({
        type: 'broadcast_metrics',
        data: metrics,
        clientId: message.clientId
      });
      break;

    case 'get_metrics_delta':
      // Get metrics delta and broadcast
      const delta = getMetricsDelta();
      sendToWorker({
        type: 'broadcast_metrics',
        data: delta
      });
      break;

    case 'get_logs_data':
      // Get logs data and broadcast
      getLogsData().then(data => {
        sendToWorker({
          type: 'broadcast_logs',
          data
        });
      }).catch(error => {
        console.error('Error getting logs data:', error);
      });
      break;

    case 'request_logs':
      // Send logs to specific client
      getRecentAccessAttempts(message.limit, message.filter)
        .then(attempts => {
          sendToWorker({
            type: 'send_to_client',
            clientId: message.clientId,
            data: {
              type: 'access_logs',
              data: attempts
            }
          });
        });
      break;

    case 'request_suspicious':
      getSuspiciousActivity()
        .then(suspicious => {
          sendToWorker({
            type: 'send_to_client',
            clientId: message.clientId,
            data: {
              type: 'suspicious_activity',
              data: suspicious
            }
          });
        });
      break;

    case 'client_disconnected':
      console.log(`🔌 Client ${message.clientId} disconnected`);
      break;

    case 'client_error':
      console.error(`⚠️ Client ${message.clientId} error: ${message.error}`);
      break;

    case 'error':
      console.error('❌ Worker error:', message.error);
      break;

    case 'shutdown_complete':
      console.log('✅ WebSocket worker shutdown complete');
      break;
  }
}

/**
 * Get logs data for broadcast
 */
async function getLogsData() {
  try {
    const [attempts, suspicious, activeRules] = await Promise.all([
      getRecentAccessAttempts(20),
      getSuspiciousActivity(),
      getActiveRules()
    ]);

    return {
      recent_attempts: attempts,
      suspicious_activity: suspicious,
      active_rules_count: activeRules.length
    };
  } catch (error) {
    console.error('Error getting logs data:', error);
    return {
      recent_attempts: [],
      suspicious_activity: [],
      active_rules_count: 0
    };
  }
}

/**
 * Send upgrade request to worker
 */
function sendUpgradeToWorker(request, socket, head) {
  if (!worker || !isReady) {
    // Queue for later
    pendingUpgrades.push({ request, socket, head });
    return;
  }

  // Transfer socket to worker
  worker.postMessage({
    type: 'handle_upgrade',
    request: {
      url: request.url,
      headers: request.headers,
      method: request.method
    },
    socket: socket,
    head: head
  }, [socket]);
}

/**
 * Send message to worker
 */
function sendToWorker(message) {
  if (worker && isReady) {
    worker.postMessage(message);
  }
}

/**
 * Broadcast firewall event
 */
export function broadcastFirewallEvent(event) {
  sendToWorker({
    type: 'broadcast_firewall_event',
    event
  });
}

/**
 * Broadcast security alert
 */
export function broadcastSecurityAlert(alert) {
  sendToWorker({
    type: 'broadcast_security_alert',
    alert
  });
}

/**
 * Get connected clients count
 */
export function getConnectedClientsCount() {
  return new Promise((resolve) => {
    if (!worker) {
      resolve(0);
      return;
    }

    const handler = (message) => {
      if (message.type === 'client_count') {
        worker.removeListener('message', handler);
        resolve(message.count);
      }
    };

    worker.on('message', handler);
    sendToWorker({ type: 'get_client_count' });

    // Timeout fallback
    setTimeout(() => {
      worker.removeListener('message', handler);
      resolve(0);
    }, 1000);
  });
}

/**
 * Stop WebSocket worker
 */
export async function stopWebSocketWorker() {
  return new Promise((resolve) => {
    if (!worker) {
      resolve();
      return;
    }

    const handler = () => {
      worker.removeListener('exit', handler);
      worker = null;
      isReady = false;
      resolve();
    };

    worker.on('exit', handler);
    sendToWorker({ type: 'shutdown' });

    // Force terminate after timeout
    setTimeout(() => {
      if (worker) {
        worker.terminate();
        worker = null;
        isReady = false;
        resolve();
      }
    }, 5000);
  });
}

/**
 * Handle HTTP upgrade requests
 */
export function handleWebSocketUpgrade(request, socket, head) {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  
  if (pathname === '/ws/monitoring') {
    sendUpgradeToWorker(request, socket, head);
    return true;
  }
  
  return false;
}
