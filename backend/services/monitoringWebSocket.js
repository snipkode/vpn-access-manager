// Re-export from websocketManager for backward compatibility
export {
  broadcastFirewallEvent,
  broadcastSecurityAlert,
  getConnectedClientsCount
} from './websocketManager.js';

// Deprecated: Use websocketManager instead
export async function initializeMonitoringWebSocket(server) {
  console.warn('⚠️ initializeMonitoringWebSocket is deprecated. Use initializeWebSocketWorker from websocketManager.js instead.');
  const { initializeWebSocketWorker, handleWebSocketUpgrade } = await import('./websocketManager.js');
  return initializeWebSocketWorker(server);
}
