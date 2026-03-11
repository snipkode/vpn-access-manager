import { db } from '../config/firebase.js';

/**
 * Blocked Ports Settings Service
 * Manages configurable list of blocked/protected ports
 */

const BLOCKED_PORTS_COLLECTION = 'blocked_ports_settings';

/**
 * Get all blocked ports from database
 * @returns {Promise<Array>} Array of blocked ports
 */
export async function getBlockedPortsSettings() {
  try {
    const snapshot = await db.collection(BLOCKED_PORTS_COLLECTION)
      .orderBy('port', 'asc')
      .get();
    
    const ports = [];
    snapshot.forEach(doc => {
      ports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // If no settings exist, create defaults
    if (ports.length === 0) {
      await initializeDefaultBlockedPorts();
      return getBlockedPortsSettings();
    }
    
    return ports;
  } catch (error) {
    console.error('Error getting blocked ports:', error.message);
    return [];
  }
}

/**
 * Initialize default blocked ports
 */
async function initializeDefaultBlockedPorts() {
  const defaults = [
    { port: 51820, reason: 'WireGuard VPN port', level: 'danger', enabled: true },
    { port: 443, reason: 'HTTPS server port', level: 'danger', enabled: true },
    { port: 80, reason: 'HTTP server port', level: 'danger', enabled: true },
    { port: 22, reason: 'SSH port', level: 'warning', enabled: true },
  ];
  
  const batch = db.batch();
  
  defaults.forEach(portData => {
    const ref = db.collection(BLOCKED_PORTS_COLLECTION).doc();
    batch.set(ref, {
      ...portData,
      created_at: new Date().toISOString(),
      is_default: true
    });
  });
  
  await batch.commit();
}

/**
 * Add new blocked port
 * @param {Object} portData - Port data
 * @param {number} portData.port - Port number
 * @param {string} portData.reason - Reason for blocking
 * @param {'danger'|'warning'} portData.level - Risk level
 * @returns {Promise<Object>} Created port
 */
export async function addBlockedPort(portData) {
  try {
    const { port, reason, level = 'warning' } = portData;
    
    // Validate port
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      throw new Error('Port must be between 1 and 65535');
    }
    
    // Check if port already exists
    const existing = await db.collection(BLOCKED_PORTS_COLLECTION)
      .where('port', '==', portNum)
      .get();
    
    if (!existing.empty) {
      throw new Error(`Port ${portNum} is already blocked`);
    }
    
    const ref = await db.collection(BLOCKED_PORTS_COLLECTION).add({
      port: portNum,
      reason,
      level,
      enabled: true,
      created_at: new Date().toISOString(),
      is_default: false
    });
    
    return {
      id: ref.id,
      port: portNum,
      reason,
      level,
      enabled: true
    };
  } catch (error) {
    console.error('Error adding blocked port:', error.message);
    throw error;
  }
}

/**
 * Update blocked port
 * @param {string} portId - Port ID
 * @param {Object} portData - Updated port data
 * @returns {Promise<Object>} Updated port
 */
export async function updateBlockedPort(portId, portData) {
  try {
    const { port, reason, level, enabled } = portData;
    
    const updateData = {};
    if (port !== undefined) updateData.port = parseInt(port, 10);
    if (reason !== undefined) updateData.reason = reason;
    if (level !== undefined) updateData.level = level;
    if (enabled !== undefined) updateData.enabled = enabled;
    
    await db.collection(BLOCKED_PORTS_COLLECTION).doc(portId).update({
      ...updateData,
      updated_at: new Date().toISOString()
    });
    
    return { id: portId, ...updateData };
  } catch (error) {
    console.error('Error updating blocked port:', error.message);
    throw error;
  }
}

/**
 * Delete blocked port
 * @param {string} portId - Port ID
 * @returns {Promise<void>}
 */
export async function deleteBlockedPort(portId) {
  try {
    const doc = await db.collection(BLOCKED_PORTS_COLLECTION).doc(portId).get();
    
    if (!doc.exists) {
      throw new Error('Blocked port not found');
    }
    
    const data = doc.data();
    if (data.is_default) {
      throw new Error('Cannot delete default protected ports');
    }
    
    await db.collection(BLOCKED_PORTS_COLLECTION).doc(portId).delete();
  } catch (error) {
    console.error('Error deleting blocked port:', error.message);
    throw error;
  }
}

/**
 * Toggle blocked port enabled/disabled
 * @param {string} portId - Port ID
 * @returns {Promise<Object>} Updated port
 */
export async function toggleBlockedPort(portId) {
  try {
    const doc = await db.collection(BLOCKED_PORTS_COLLECTION).doc(portId).get();
    
    if (!doc.exists) {
      throw new Error('Blocked port not found');
    }
    
    const newEnabled = !doc.data().enabled;
    
    await db.collection(BLOCKED_PORTS_COLLECTION).doc(portId).update({
      enabled: newEnabled,
      updated_at: new Date().toISOString()
    });
    
    return { id: portId, enabled: newEnabled };
  } catch (error) {
    console.error('Error toggling blocked port:', error.message);
    throw error;
  }
}

/**
 * Check if a port is blocked
 * @param {number} port - Port to check
 * @returns {Promise<{blocked: boolean, reason?: string, level?: string}>}
 */
export async function isPortBlockedDynamic(port) {
  try {
    const snapshot = await db.collection(BLOCKED_PORTS_COLLECTION)
      .where('port', '==', parseInt(port, 10))
      .where('enabled', '==', true)
      .get();
    
    if (snapshot.empty) {
      return { blocked: false };
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      blocked: true,
      reason: data.reason,
      level: data.level
    };
  } catch (error) {
    console.error('Error checking if port is blocked:', error.message);
    return { blocked: false };
  }
}

/**
 * Get all blocked ports as a simple array
 * @returns {Promise<Array>} Array of port numbers
 */
export async function getBlockedPortsList() {
  try {
    const ports = await getBlockedPortsSettings();
    return ports
      .filter(p => p.enabled)
      .map(p => p.port);
  } catch (error) {
    console.error('Error getting blocked ports list:', error.message);
    return [51820, 443, 80, 22]; // Fallback to defaults
  }
}
