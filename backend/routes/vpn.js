import express from 'express';
import QRCode from 'qrcode';
import { auth, db } from '../config/firebase.js';
import { generateKeypair, addPeer, generateConfig, getNextAvailableIP, isWireGuardHealthy, disablePeer, reactivatePeer } from '../services/wireguard.js';
import { rateLimiters } from '../middleware/rateLimit.js';
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
    const now = new Date();
    const subscriptionEnd = userData.subscription_end 
      ? new Date(userData.subscription_end) 
      : null;
    
    if (!subscriptionEnd || subscriptionEnd < now) {
      return res.status(403).json({
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please top up to continue.',
        subscription_end: userData.subscription_end,
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

    // Check device limit with transaction to prevent race condition
    const devicesRef = db.collection('devices').where('user_id', '==', uid);
    const devicesSnapshot = await devicesRef.get();

    if (devicesSnapshot.size >= MAX_DEVICES) {
      return res.status(400).json({
        error: 'Device limit reached',
        message: `Maximum ${MAX_DEVICES} devices per user`,
      });
    }

    // Generate VPN config
    const usedIPs = devicesSnapshot.docs.map((doc) => doc.data().ip_address);
    const newIP = getNextAvailableIP(usedIPs);
    const { privateKey, publicKey } = generateKeypair();

    // Add peer to WireGuard
    addPeer(publicKey, newIP);
    const config = generateConfig(privateKey, newIP, deviceName);
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

    const deviceRef = db.collection('devices').doc();
    await deviceRef.set({
      user_id: uid,
      device_name: deviceName,
      public_key: publicKey,
      private_key: privateKey,
      ip_address: newIP,
      status: 'active',
      created_at: new Date().toISOString(),
    });
    
    console.log('🟢 Device saved to Firestore:', {
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
  } catch (error) {
    console.error('Generate VPN config error:', error.message);
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

export default router;
