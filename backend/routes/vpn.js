import express from 'express';
import QRCode from 'qrcode';
import { execSync } from 'child_process';
import { auth, db } from '../config/firebase.js';
import { generateKeypair, addPeer, generateConfig, getNextAvailableIP, isWireGuardHealthy, disablePeer, reactivatePeer, getUsedIPsFromWireGuard } from '../services/wireguard.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import { cleanupExpiredLeases, extendLease, renewLeaseFromSubscription } from '../scripts/cleanup-expired-leases.js';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '../utils/apiResponse.js';

const router = express.Router();
const MAX_DEVICES = 3;
const MAX_DEVICE_NAME_LENGTH = 50;

/**
 * @swagger
 * tags:
 *   name: VPN
 *   description: VPN configuration and device management
 */

// Auth middleware
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'Unauthorized - No token provided');
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return unauthorizedResponse(res, 'Invalid token');
  }
};

/**
 * Sanitize WireGuard public key (prevent shell injection)
 * Only allow valid base64 characters
 */
function sanitizePublicKey(key) {
  if (!key || typeof key !== 'string') {
    return '';
  }
  // Remove any character that's not valid in base64
  return key.replace(/[^a-zA-Z0-9+/=]/g, '').trim();
}

/**
 * Sanitize device name (prevent XSS and injection)
 */
function sanitizeDeviceName(name) {
  if (!name || typeof name !== 'string') {
    return 'VPN Device';
  }
  // Remove special characters, limit length
  return name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim().substring(0, MAX_DEVICE_NAME_LENGTH) || 'VPN Device';
}

/**
 * Validate Firestore document ID
 */
function isValidDocId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 50;
}

/**
 * @swagger
 * /api/vpn/generate:
 *   post:
 *     summary: Generate VPN configuration for a new device
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceName:
 *                 type: string
 *                 example: 'iPhone 14'
 *     responses:
 *       200:
 *         description: VPN configuration generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 device_id: { type: string }
 *                 device_name: { type: string }
 *                 ip_address: { type: string }
 *                 public_key: { type: string }
 *                 config: { type: string }
 *                 qr: { type: string }
 *                 created_at: { type: string, format: date-time }
 *       403:
 *         description: VPN access not enabled
 *       400:
 *         description: Device limit reached (max 3 devices)
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to generate VPN config
 */
router.post('/generate', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    // Support both camelCase and snake_case for device name
    let deviceName = req.body.deviceName || req.body.device_name;

    // Log received device name
    console.log('🟢 Generate VPN config request:', {
      uid,
      deviceName,
      body: req.body
    });

    // Sanitize device name
    deviceName = sanitizeDeviceName(deviceName);
    
    console.log('🟢 Sanitized device name:', deviceName);

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    // Check if VPN access is enabled
    if (!userData.vpn_enabled) {
      return res.status(403).json({
        error: 'VPN access not enabled',
        message: 'Contact admin to enable VPN access',
      });
    }

    // Check if subscription is active (not expired)
    // Check both subscription_end (paid) and subscription_end_at (trial)
    const now = new Date();
    let subscriptionEnd = null;
    
    // Try subscription_end first (for paid subscriptions)
    if (userData.subscription_end) {
      subscriptionEnd = new Date(userData.subscription_end);
    }
    // Then try subscription_end_at (for trials)
    else if (userData.subscription_end_at) {
      subscriptionEnd = new Date(userData.subscription_end_at);
    }

    if (!subscriptionEnd || subscriptionEnd < now) {
      return res.status(403).json({
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please top up to continue.',
        subscription_end: userData.subscription_end || userData.subscription_end_at,
        expired_days: subscriptionEnd
          ? Math.floor((now - subscriptionEnd) / (1000 * 60 * 60 * 24))
          : 0,
      });
    }

    // Check WireGuard health before generating
    if (!isWireGuardHealthy()) {
      return res.status(503).json({
        error: 'VPN service unavailable',
        message: 'WireGuard service is currently down. Please contact admin.',
      });
    }

    // Check device limit and allocate IP atomically with transaction
    const { deviceRef, newIP, privateKey, publicKey } = await db.runTransaction(async (transaction) => {
      const devicesRef = db.collection('devices').where('user_id', '==', uid);
      const devicesSnapshot = await transaction.get(devicesRef);

      if (devicesSnapshot.size >= MAX_DEVICES) {
        const error = new Error('Device limit reached');
        error.code = 'DEVICE_LIMIT_REACHED';
        throw error;
      }

      // Get used IPs from both Firestore and WireGuard
      const firestoreIPs = devicesSnapshot.docs.map(doc => doc.data().ip_address);
      const wgIPs = getUsedIPsFromWireGuard();
      const allUsedIPs = [...new Set([...firestoreIPs, ...wgIPs])];

      console.log('📊 Transaction IP Check:', {
        firestoreIPs: firestoreIPs.length,
        wireguardIPs: wgIPs.length,
        totalUsed: allUsedIPs.length
      });

      // Allocate IP
      const newIP = getNextAvailableIP(allUsedIPs);

      // Generate keys
      const { privateKey, publicKey } = generateKeypair();

      // Create device reference and reserve in transaction
      const deviceRef = db.collection('devices').doc();
      transaction.set(deviceRef, {
        user_id: uid,
        device_name: deviceName,
        public_key: publicKey,
        private_key: privateKey,
        ip_address: newIP,
        status: 'pending', // Set to pending until WireGuard peer is added
        created_at: new Date().toISOString(),
        lease_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

      console.log('🔒 IP reserved in transaction:', {
        deviceId: deviceRef.id,
        ip_address: newIP,
        public_key: publicKey.substring(0, 20) + '...'
      });

      return { deviceRef, newIP, privateKey, publicKey };
    });

    // Add peer to WireGuard with conflict detection (outside transaction)
    try {
      addPeer(publicKey, newIP);
    } catch (wgError) {
      // Handle specific WireGuard errors
      console.error('WireGuard addPeer failed:', wgError.message);

      // Rollback: Delete the pending device from Firestore
      try {
        await deviceRef.delete();
        console.log('🔄 Rollback: Deleted pending device from Firestore');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError.message);
      }

      // Check for IP conflict error
      if (wgError.message.includes('already in use')) {
        return res.status(409).json({
          error: 'IP address conflict',
          message: 'The assigned IP is already in use. Please try again.',
          details: wgError.message
        });
      }

      // Check for duplicate key error
      if (wgError.message.includes('already exists')) {
        return res.status(409).json({
          error: 'Duplicate key',
          message: 'Generated key already exists. Please try again.',
          details: wgError.message
        });
      }

      // Generic WireGuard error
      throw wgError;
    }

    const config = generateConfig(privateKey, newIP, deviceName);
    // Generate QR code as PNG base64 with high quality for scanning
    const qrCodeData = await QRCode.toDataURL(config, {
      width: 400,
      height: 400,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // Update status from 'pending' to 'active' and create audit log
    try {
      await deviceRef.update({
        status: 'active',
        activated_at: new Date().toISOString(),
      });

      // Create audit log for IP allocation
      await db.collection('audit_logs').doc().set({
        action: 'device_created',
        user_id: uid,
        device_id: deviceRef.id,
        device_name: deviceName,
        device_public_key: publicKey,
        device_ip: newIP,
        ip_allocation_source: 'auto',
        timestamp: new Date().toISOString(),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']?.substring(0, 200) || 'unknown'
      });

      console.log('🟢 Device activated and audit log created:', {
        deviceId: deviceRef.id,
        device_name: deviceName,
        ip_address: newIP
      });

      res.json({
        device_id: deviceRef.id,
        device_name: deviceName,
        ip_address: newIP,
        public_key: publicKey,
        config,
        qr: qrCodeData,
        created_at: new Date().toISOString(),
        subscription_end: userData.subscription_end,
        days_remaining: Math.floor((subscriptionEnd - now) / (1000 * 60 * 60 * 24)),
      });
    } catch (firestoreError) {
      // ROLLBACK: Remove peer from WireGuard if Firestore update fails
      console.error('Firestore update failed, rolling back WireGuard peer...');

      try {
        const { removePeer } = await import('../services/wireguard.js');
        removePeer(publicKey);
        console.log('✅ Rollback successful: WireGuard peer removed');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError.message);
      }

      throw firestoreError;
    }
  } catch (error) {
    console.error('Generate VPN config error:', error.message);

    // Handle device limit error from transaction
    if (error.code === 'DEVICE_LIMIT_REACHED') {
      return res.status(400).json({
        error: 'Device limit reached',
        message: `Maximum ${MAX_DEVICES} devices per user`,
      });
    }

    // Handle specific error types
    if (error.message.includes('IP address conflict') || error.message.includes('Duplicate key')) {
      return res.status(409).json({
        error: error.message.includes('IP address conflict') ? 'IP address conflict' : 'Duplicate key',
        message: error.message,
      });
    }

    res.status(500).json({ error: 'Failed to generate VPN config', details: error.message });
  }
});

/**
 * @swagger
 * /api/vpn/devices:
 *   get:
 *     summary: Get user's VPN devices
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 devices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 *       500:
 *         description: Failed to get devices
 */
router.get('/devices', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const devicesRef = db.collection('devices').where('user_id', '==', uid);
    const devicesSnapshot = await devicesRef.get();

    const devices = devicesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error.message);
    res.status(500).json({ error: 'Failed to get devices', details: error.message });
  }
});

/**
 * @swagger
 * /api/vpn/device/{id}:
 *   get:
 *     summary: Get VPN device configuration with QR code
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: VPN device configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 device_id: { type: string }
 *                 device_name: { type: string }
 *                 ip_address: { type: string }
 *                 public_key: { type: string }
 *                 config: { type: string }
 *                 qr: { type: string }
 *                 status: { type: string }
 *                 created_at: { type: string, format: date-time }
 *       403:
 *         description: Unauthorized - Device belongs to another user
 *       404:
 *         description: Device not found
 *       500:
 *         description: Failed to get device config
 */
router.get('/device/:id',
  verifyAuth,
  async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;

    // Validate device ID format
    if (!isValidDocId(id)) {
      return res.status(400).json({
        error: 'Invalid device ID',
        message: 'Device ID must be alphanumeric (max 50 chars)'
      });
    }

    const deviceRef = db.collection('devices').doc(id);
    const deviceDoc = await deviceRef.get();

    if (!deviceDoc.exists) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const deviceData = deviceDoc.data();

    // Check ownership
    if (deviceData.user_id !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if device is revoked
    if (deviceData.status === 'revoked') {
      return res.status(400).json({
        error: 'Device revoked',
        message: 'This device has been revoked'
      });
    }

    // Generate config and QR code on-demand
    const config = generateConfig(deviceData.private_key, deviceData.ip_address, deviceData.device_name);
    // Generate QR code as PNG base64 with high quality for scanning
    const qrCodeData = await QRCode.toDataURL(config, {
      width: 400,
      height: 400,
      margin: 3,
      errorCorrectionLevel: 'H', // High error correction for better scanning
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.json({
      device_id: id,
      device_name: deviceData.device_name,
      ip_address: deviceData.ip_address,
      public_key: deviceData.public_key,
      config,
      qr: qrCodeData,
      status: deviceData.status,
      created_at: deviceData.created_at,
    });
  } catch (error) {
    console.error('Get device config error:', error.message);
    res.status(500).json({ error: 'Failed to get device config', details: error.message });
  }
});

/**
 * @swagger
 * /api/vpn/device/{id}:
 *   delete:
 *     summary: Revoke user's VPN device
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device revoked successfully
 *       403:
 *         description: Unauthorized - Device belongs to another user
 *       404:
 *         description: Device not found
 *       500:
 *         description: Failed to revoke device
 */
router.delete('/device/:id', 
  verifyAuth, 
  rateLimiters.vpnGenerate,  // Rate limit: 10 per hour
  async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;

    // Validate device ID format
    if (!isValidDocId(id)) {
      return res.status(400).json({ 
        error: 'Invalid device ID',
        message: 'Device ID must be alphanumeric (max 50 chars)'
      });
    }

    const deviceRef = db.collection('devices').doc(id);
    const deviceDoc = await deviceRef.get();

    if (!deviceDoc.exists) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const deviceData = deviceDoc.data();
    
    // Check ownership
    if (deviceData.user_id !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if already revoked
    if (deviceData.status === 'revoked') {
      return res.status(400).json({ 
        error: 'Device already revoked',
        message: 'This device has already been revoked'
      });
    }

    // Sanitize public key before using in shell command
    const sanitizedPublicKey = sanitizePublicKey(deviceData.public_key);
    
    // Remove from WireGuard with proper error handling
    try {
      const { execSync } = await import('child_process');
      const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
      
      console.log(`Removing WireGuard peer: ${sanitizedPublicKey}`);

      // Use sanitized key and quoted to prevent shell injection
      execSync(`wg set ${WG_INTERFACE} peer '${sanitizedPublicKey}' remove`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000
      });

      // Use bash explicitly for pipe command
      execSync(`bash -c "wg-quick strip ${WG_INTERFACE} | wg setconf ${WG_INTERFACE} /dev/stdin"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000
      });

      console.log('WireGuard peer removed successfully');
    } catch (wgError) {
      // Log error but don't fail the request
      // Device will be removed from DB even if WG removal fails
      console.error('WireGuard remove error:', wgError.message);
      console.warn('Device removed from database but WireGuard removal failed');
    }

    // Update device status to revoked (soft delete for audit trail)
    await deviceRef.update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: uid,
    });

    // Create audit log
    try {
      await db.collection('audit_logs').doc().set({
        action: 'device_revoked',
        user_id: uid,
        device_id: id,
        device_name: deviceData.device_name,
        device_public_key: sanitizedPublicKey,
        device_ip: deviceData.ip_address,
        timestamp: new Date().toISOString(),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']?.substring(0, 200) || 'unknown'
      });
      console.log(`Audit log created for device revocation: ${id}`);
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError.message);
      // Don't fail the request if audit log fails
    }

    res.json({
      message: 'Device revoked successfully',
      device_id: id,
      device_name: deviceData.device_name,
      wireguard_removed: true,
      revoked_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Revoke device error:', error.message);
    res.status(500).json({
      error: 'Failed to revoke device',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /api/vpn/device/{id}/disable:
 *   post:
 *     summary: Disable a VPN device (admin only)
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device disabled successfully
 *       404:
 *         description: Device not found
 *       500:
 *         description: Failed to disable device
 */
router.post('/device/:id/disable', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;

    // Verify admin
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validate device ID format
    if (!isValidDocId(id)) {
      return res.status(400).json({
        error: 'Invalid device ID',
        message: 'Device ID must be alphanumeric (max 50 chars)'
      });
    }

    const deviceRef = db.collection('devices').doc(id);
    const deviceDoc = await deviceRef.get();

    if (!deviceDoc.exists) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const deviceData = deviceDoc.data();

    // Check if already disabled or revoked
    if (deviceData.status === 'disabled') {
      return res.status(400).json({
        error: 'Device already disabled',
        message: 'This device is already disabled'
      });
    }

    if (deviceData.status === 'revoked') {
      return res.status(400).json({
        error: 'Device already revoked',
        message: 'This device has been revoked'
      });
    }

    // Sanitize public key
    const sanitizedPublicKey = sanitizePublicKey(deviceData.public_key);

    // Remove from WireGuard interface (disable)
    try {
      disablePeer(sanitizedPublicKey);
    } catch (wgError) {
      console.error('WireGuard disable error:', wgError.message);
      // Continue anyway - we still want to update the database
    }

    // Update device status to disabled
    await deviceRef.update({
      status: 'disabled',
      disabled_at: new Date().toISOString(),
      disabled_by: uid,
    });

    // Create audit log
    try {
      await db.collection('audit_logs').doc().set({
        action: 'device_disabled',
        user_id: uid,
        device_id: id,
        device_name: deviceData.device_name,
        device_public_key: sanitizedPublicKey,
        device_ip: deviceData.ip_address,
        timestamp: new Date().toISOString(),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']?.substring(0, 200) || 'unknown'
      });
      console.log(`Audit log created for device disable: ${id}`);
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError.message);
    }

    res.json({
      message: 'Device disabled successfully',
      device_id: id,
      device_name: deviceData.device_name,
      ip_address: deviceData.ip_address,
      wireguard_removed: true,
      disabled_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Disable device error:', error.message);
    res.status(500).json({
      error: 'Failed to disable device',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /api/vpn/device/{id}/reactivate:
 *   post:
 *     summary: Reactivate a disabled VPN device (admin only)
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device reactivated successfully
 *       400:
 *         description: Device not disabled
 *       404:
 *         description: Device not found
 *       500:
 *         description: Failed to reactivate device
 */
router.post('/device/:id/reactivate', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;

    // Verify admin
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validate device ID format
    if (!isValidDocId(id)) {
      return res.status(400).json({
        error: 'Invalid device ID',
        message: 'Device ID must be alphanumeric (max 50 chars)'
      });
    }

    const deviceRef = db.collection('devices').doc(id);
    const deviceDoc = await deviceRef.get();

    if (!deviceDoc.exists) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const deviceData = deviceDoc.data();

    // Check if device is disabled
    if (deviceData.status !== 'disabled') {
      return res.status(400).json({
        error: 'Device not disabled',
        message: `Cannot reactivate device with status: ${deviceData.status}`
      });
    }

    // Sanitize public key
    const sanitizedPublicKey = sanitizePublicKey(deviceData.public_key);

    // Add back to WireGuard interface (reactivate)
    try {
      reactivatePeer(sanitizedPublicKey, deviceData.ip_address);
    } catch (wgError) {
      console.error('WireGuard reactivate error:', wgError.message);
      return res.status(500).json({
        error: 'Failed to reactivate WireGuard peer',
        details: wgError.message
      });
    }

    // Update device status to active
    await deviceRef.update({
      status: 'active',
      reactivated_at: new Date().toISOString(),
      reactivated_by: uid,
    });

    // Create audit log
    try {
      await db.collection('audit_logs').doc().set({
        action: 'device_reactivated',
        user_id: uid,
        device_id: id,
        device_name: deviceData.device_name,
        device_public_key: sanitizedPublicKey,
        device_ip: deviceData.ip_address,
        timestamp: new Date().toISOString(),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']?.substring(0, 200) || 'unknown'
      });
      console.log(`Audit log created for device reactivation: ${id}`);
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError.message);
    }

    res.json({
      message: 'Device reactivated successfully',
      device_id: id,
      device_name: deviceData.device_name,
      ip_address: deviceData.ip_address,
      wireguard_added: true,
      reactivated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Reactivate device error:', error.message);
    res.status(500).json({
      error: 'Failed to reactivate device',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /api/vpn/health:
 *   get:
 *     summary: Get WireGuard health status and sync state
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health status
 */
router.get('/health', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';

    // Verify admin
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const wgHealthy = isWireGuardHealthy();
    
    // Get all active devices from Firestore
    const firestoreDevices = await db.collection('devices')
      .where('status', '==', 'active')
      .get();
    
    const firestoreIPs = firestoreDevices.docs.map(d => d.data().ip_address);
    const wgIPs = getUsedIPsFromWireGuard();
    
    // Detect orphaned peers (in WG but not in Firestore)
    const orphanedIPs = wgIPs.filter(ip => !firestoreIPs.includes(ip));
    
    // Detect stale records (in Firestore but not in WG)
    const staleIPs = firestoreIPs.filter(ip => !wgIPs.includes(ip));
    
    // Calculate IP utilization
    const totalIPs = 252; // /24 subnet minus gateway and broadcast
    const usedIPs = wgIPs.length;
    
    res.json({
      wireguard_healthy: wgHealthy,
      total_devices: firestoreDevices.size,
      active_peers: wgIPs.length,
      ip_utilization: `${usedIPs}/${totalIPs}`,
      ip_utilization_percent: Math.round((usedIPs / totalIPs) * 100),
      orphaned_peers: orphanedIPs.length,
      orphaned_ips: orphanedIPs,
      stale_records: staleIPs.length,
      stale_ips: staleIPs,
      sync_status: orphanedIPs.length === 0 && staleIPs.length === 0 ? 'synced' : 'out_of_sync',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(500).json({ error: 'Failed to get health status', details: error.message });
  }
});

/**
 * @swagger
 * /api/vpn/ip-pool:
 *   get:
 *     summary: Get IP pool status (admin only)
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: IP pool status
 */
router.get('/ip-pool', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';

    // Verify admin
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const devices = await db.collection('devices').get();
    const wgOutput = execSync(`wg show ${WG_INTERFACE} allowed-ips`, {
      stdio: ['pipe', 'pipe', 'pipe']
    }).toString();
    
    // Parse WG IPs
    const wgIPs = [];
    wgOutput.split('\n').forEach(line => {
      const matches = line.match(/(\d+\.\d+\.\d+\.\d+)\/32/g);
      if (matches) {
        matches.forEach(match => wgIPs.push(match.replace('/32', '')));
      }
    });
    
    // Build IP pool status
    const pool = [];
    const baseIP = '10.0.0';
    
    for (let i = 1; i <= 254; i++) {
      const ip = `${baseIP}.${i}`;
      const device = devices.docs.find(d => d.data().ip_address === ip);
      const inWG = wgIPs.includes(ip);
      
      let status = 'available';
      if (i === 1) {
        status = 'gateway';
      } else if (device) {
        status = inWG ? 'active' : 'stale';
      } else if (inWG) {
        status = 'orphaned';
      }
      
      if (status !== 'available') {
        pool.push({
          ip,
          status,
          user_id: device?.data().user_id || null,
          device_id: device?.id || null,
          device_name: device?.data().device_name || null,
          device_status: device?.data().status || null,
          lease_expires: device?.data().lease_expires || null
        });
      }
    }
    
    // Summary statistics
    const summary = {
      total: pool.length,
      active: pool.filter(p => p.status === 'active').length,
      stale: pool.filter(p => p.status === 'stale').length,
      orphaned: pool.filter(p => p.status === 'orphaned').length,
      gateway: pool.filter(p => p.status === 'gateway').length,
      available: 252 - pool.length
    };
    
    res.json({
      pool,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('IP pool status error:', error.message);
    res.status(500).json({ error: 'Failed to get IP pool status', details: error.message });
  }
});

/**
 * @swagger
 * /api/vpn/sync:
 *   post:
 *     summary: Sync WireGuard with Firestore (admin only)
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync completed
 */
router.post('/sync', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';

    // Verify admin
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const actions = [];
    
    // Get all active devices from Firestore
    const firestoreDevices = await db.collection('devices')
      .where('status', 'in', ['active', 'pending'])
      .get();
    
    const wgOutput = execSync(`wg show ${WG_INTERFACE} allowed-ips`, {
      stdio: ['pipe', 'pipe', 'pipe']
    }).toString();
    
    // Parse WG IPs to map IP -> public key
    const wgIPMap = new Map();
    wgOutput.split('\n').forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const publicKey = parts[0];
        const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)\/32/);
        if (ipMatch) {
          wgIPMap.set(ipMatch[1], publicKey);
        }
      }
    });
    
    // Check each Firestore device
    for (const device of firestoreDevices.docs) {
      const data = device.data();
      const inWG = wgIPMap.has(data.ip_address);
      
      if (!inWG) {
        // Device in Firestore but not in WG - re-add it
        try {
          addPeer(data.public_key, data.ip_address);
          actions.push({ 
            action: 'readded', 
            device_id: device.id, 
            ip: data.ip_address,
            device_name: data.device_name
          });
          console.log(`🔄 Re-added peer: ${device.id} (${data.ip_address})`);
        } catch (error) {
          actions.push({ 
            action: 'readd_failed', 
            device_id: device.id, 
            ip: data.ip_address,
            error: error.message
          });
          console.error(`❌ Failed to re-add peer: ${device.id}`, error.message);
        }
      }
    }
    
    // Check for orphaned peers in WG
    for (const [ip, publicKey] of wgIPMap.entries()) {
      const device = firestoreDevices.docs.find(d => d.data().ip_address === ip);
      if (!device) {
        // Peer in WG but not in Firestore - remove it
        try {
          execSync(`wg set ${WG_INTERFACE} peer '${publicKey}' remove`, {
            stdio: ['pipe', 'pipe', 'pipe']
          });
          actions.push({ 
            action: 'removed_orphan', 
            ip, 
            public_key: publicKey.substring(0, 20) + '...'
          });
          console.log(`🗑️ Removed orphan peer: ${ip}`);
        } catch (error) {
          actions.push({ 
            action: 'remove_failed', 
            ip, 
            error: error.message
          });
        }
      }
    }
    
    // Update config file
    try {
      execSync(`bash -c "wg showconf ${WG_INTERFACE} > /etc/wireguard/${WG_INTERFACE}.conf"`, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      actions.push({ action: 'config_updated' });
    } catch (error) {
      actions.push({ action: 'config_update_failed', error: error.message });
    }
    
    res.json({
      sync_completed: true,
      actions,
      total_actions: actions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync error:', error.message);
    res.status(500).json({ error: 'Failed to sync', details: error.message });
  }
});

/**
 * @swagger
 * /api/vpn/admin/leases/cleanup:
 *   post:
 *     summary: Run expired lease cleanup (admin only)
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed
 */
router.post('/admin/leases/cleanup', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    
    // Verify admin
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const results = await cleanupExpiredLeases();
    
    res.json({
      cleanup_completed: true,
      ...results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cleanup error:', error.message);
    res.status(500).json({ error: 'Failed to cleanup leases', details: error.message });
  }
});

/**
 * @swagger
 * /api/vpn/admin/device/{id}/extend-lease:
 *   post:
 *     summary: Extend device lease (admin only)
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: number
 *                 example: 30
 *     responses:
 *       200:
 *         description: Lease extended
 */
router.post('/admin/device/:id/extend-lease', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const { days = 30 } = req.body;
    
    // Verify admin
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await extendLease(id, days);
    
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Extend lease error:', error.message);
    res.status(500).json({ error: 'Failed to extend lease', details: error.message });
  }
});

/**
 * @swagger
 * /api/vpn/admin/device/{id}/renew-lease:
 *   post:
 *     summary: Renew device lease from user subscription (admin only)
 *     tags: [VPN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Lease renewed
 */
router.post('/admin/device/:id/renew-lease', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    
    // Verify admin
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await renewLeaseFromSubscription(id);
    
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Renew lease error:', error.message);
    res.status(500).json({ error: 'Failed to renew lease', details: error.message });
  }
});

export default router;
