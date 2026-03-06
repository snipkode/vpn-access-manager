import express from 'express';
import QRCode from 'qrcode';
import { auth, db } from '../config/firebase.js';
import { generateKeypair, addPeer, generateConfig, getNextAvailableIP } from '../services/wireguard.js';

const router = express.Router();
const MAX_DEVICES = 3;

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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

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
    const { deviceName = 'VPN Device' } = req.body;

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

    // Check device limit
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

    addPeer(publicKey, newIP);
    const config = generateConfig(privateKey, newIP, deviceName);
    const qrCodeData = await QRCode.toString(config, { type: 'string' });

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
router.delete('/device/:id', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;

    const deviceRef = db.collection('devices').doc(id);
    const deviceDoc = await deviceRef.get();

    if (!deviceDoc.exists) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const deviceData = deviceDoc.data();
    if (deviceData.user_id !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Remove from WireGuard
    try {
      const { execSync } = await import('child_process');
      const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
      execSync(`wg set ${WG_INTERFACE} peer ${deviceData.public_key} remove`);
      execSync(`wg syncconf ${WG_INTERFACE} <(wg-quick strip ${WG_INTERFACE})`);
    } catch (wgError) {
      console.error('WireGuard remove error:', wgError.message);
    }

    await deviceRef.delete();
    res.json({ message: 'Device revoked successfully' });
  } catch (error) {
    console.error('Revoke device error:', error.message);
    res.status(500).json({ error: 'Failed to revoke device', details: error.message });
  }
});

export default router;
