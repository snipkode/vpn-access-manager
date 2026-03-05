import express from 'express';
import QRCode from 'qrcode';
import { auth, db } from '../config/firebase.js';
import {
  generateKeypair,
  addPeer,
  generateConfig,
  getNextAvailableIP,
} from '../services/wireguard.js';

const router = express.Router();

// Middleware to verify auth
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

// Generate VPN configuration
router.post('/generate', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const { deviceName = 'VPN Device' } = req.body;

    // Check if user has VPN access
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    if (!userData.vpn_enabled) {
      return res.status(403).json({ 
        error: 'VPN access not enabled',
        message: 'Please contact admin to enable VPN access' 
      });
    }

    // Check device limit (max 3 devices per user)
    const devicesRef = db.collection('devices').where('user_id', '==', uid);
    const devicesSnapshot = await devicesRef.get();
    
    if (devicesSnapshot.size >= 3) {
      return res.status(400).json({ 
        error: 'Device limit reached',
        message: 'Maximum 3 devices per user' 
      });
    }

    // Get used IPs
    const usedIPs = devicesSnapshot.docs.map(doc => doc.data().ip_address);
    const newIP = getNextAvailableIP(usedIPs);

    // Generate WireGuard keypair
    const { privateKey, publicKey } = generateKeypair();

    // Add peer to WireGuard server
    addPeer(publicKey, newIP);

    // Generate config
    const config = generateConfig(privateKey, newIP, deviceName);
    const qrCodeData = await QRCode.toString(config, { type: 'string' });

    // Save device to Firestore
    const deviceRef = db.collection('devices').doc();
    await deviceRef.set({
      user_id: uid,
      device_name: deviceName,
      public_key: publicKey,
      private_key: privateKey, // Store securely in production
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
    });
  } catch (error) {
    console.error('Generate VPN config error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate VPN config',
      details: error.message 
    });
  }
});

// Get user's devices
router.get('/devices', verifyAuth, async (req, res) => {
  try {
    const { uid } = req.user;

    const devicesRef = db.collection('devices').where('user_id', '==', uid);
    const devicesSnapshot = await devicesRef.get();

    const devices = devicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error.message);
    res.status(500).json({ error: 'Failed to get devices', details: error.message });
  }
});

// Revoke own device
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

    // Remove peer from WireGuard
    try {
      const { execSync } = await import('child_process');
      const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
      execSync(`wg set ${WG_INTERFACE} peer ${deviceData.public_key} remove`);
      execSync(`wg syncconf ${WG_INTERFACE} <(wg-quick strip ${WG_INTERFACE})`);
    } catch (wgError) {
      console.error('WireGuard remove error:', wgError.message);
    }

    // Delete from Firestore
    await deviceRef.delete();

    res.json({ message: 'Device revoked successfully' });
  } catch (error) {
    console.error('Revoke device error:', error.message);
    res.status(500).json({ error: 'Failed to revoke device', details: error.message });
  }
});

export default router;
