import express from 'express';
import { auth, db } from '../config/firebase.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only user and device management
 */

// Middleware to verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('🔐 Admin auth attempt - Token received:', token ? 'yes' : 'no');
    
    // Firebase ID tokens expire after 1 hour - frontend should refresh
    const decodedToken = await auth.verifyIdToken(token);
    console.log('✅ Token verified for user:', decodedToken.uid);

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('❌ Admin auth error:', {
      message: error.message,
      code: error.code,
      errorInfo: error.errorInfo
    });
    // Check for token expiration
    if (error.code === 'auth/id-token-expired' || error.message.includes('expired')) {
      return res.status(401).json({ 
        error: 'Token expired', 
        message: 'Please refresh your authentication token' 
      });
    }
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Failed to get users
 */
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').orderBy('created_at', 'desc').get();
    
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({ error: 'Failed to get users', details: error.message });
  }
});

// Get user by ID
router.get('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userDoc = await db.collection('users').doc(id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: userDoc.data() });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'Failed to get user', details: error.message });
  }
});

// Toggle user VPN access
router.patch('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { vpn_enabled } = req.body;

    if (typeof vpn_enabled !== 'boolean') {
      return res.status(400).json({ error: 'vpn_enabled must be boolean' });
    }

    const userRef = db.collection('users').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.update({ vpn_enabled });

    res.json({ 
      message: 'User VPN access updated',
      user: { id, vpn_enabled }
    });
  } catch (error) {
    console.error('Update user error:', error.message);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// Get all devices
router.get('/devices', verifyAdmin, async (req, res) => {
  try {
    const devicesSnapshot = await db.collection('devices').orderBy('created_at', 'desc').get();
    
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

// Revoke device (admin)
router.delete('/device/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deviceRef = db.collection('devices').doc(id);
    const deviceDoc = await deviceRef.get();

    if (!deviceDoc.exists) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const deviceData = deviceDoc.data();

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

// Get VPN stats
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const devicesSnapshot = await db.collection('devices').where('status', '==', 'active').get();

    const users = usersSnapshot.docs.map(doc => doc.data());
    const enabledUsers = users.filter(u => u.vpn_enabled).length;

    res.json({
      total_users: users.length,
      vpn_enabled_users: enabledUsers,
      vpn_disabled_users: users.length - enabledUsers,
      active_devices: devicesSnapshot.size,
    });
  } catch (error) {
    console.error('Get stats error:', error.message);
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
});

export default router;
