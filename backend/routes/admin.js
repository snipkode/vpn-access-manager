import express from 'express';
import { auth, db } from '../config/firebase.js';
import { disablePeer, reactivatePeer } from '../services/wireguard.js';

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
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, user]
 *         description: Filter users by role
 *       - in: query
 *         name: vpn_enabled
 *         schema:
 *           type: boolean
 *         description: Filter users by VPN access status
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
    const { role, vpn_enabled } = req.query;
    
    let usersQuery = db.collection('users').orderBy('created_at', 'desc');
    
    // Filter by role if provided
    if (role) {
      usersQuery = usersQuery.where('role', '==', role);
    }
    
    // Filter by vpn_enabled if provided
    if (vpn_enabled !== undefined) {
      const vpnEnabled = vpn_enabled === 'true';
      usersQuery = usersQuery.where('vpn_enabled', '==', vpnEnabled);
    }
    
    const usersSnapshot = await usersQuery.get();

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

// Delete user
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userRef = db.collection('users').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting admin users
    const userData = userDoc.data();
    if (userData.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin user' });
    }

    // Delete user's devices first
    const devicesSnapshot = await db.collection('devices')
      .where('user_id', '==', id)
      .get();

    const batch = db.batch();
    devicesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete user
    await userRef.delete();

    res.json({ message: 'User and associated devices deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Update user role
router.patch('/users/:id/role', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const userRef = db.collection('users').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.update({ role });

    res.json({
      message: 'User role updated',
      user: { id, role }
    });
  } catch (error) {
    console.error('Update user role error:', error.message);
    res.status(500).json({ error: 'Failed to update user role', details: error.message });
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
      // Use bash explicitly for pipe command
      execSync(`bash -c "wg-quick strip ${WG_INTERFACE} | wg setconf ${WG_INTERFACE} /dev/stdin"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000
      });
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

// Disable device (admin) - soft disable, keeps in database
router.post('/device/:id/disable', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deviceRef = db.collection('devices').doc(id);
    const deviceDoc = await deviceRef.get();

    if (!deviceDoc.exists) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const deviceData = deviceDoc.data();

    // Check if already disabled or revoked
    if (deviceData.status === 'disabled') {
      return res.status(400).json({ error: 'Device already disabled' });
    }

    if (deviceData.status === 'revoked') {
      return res.status(400).json({ error: 'Device already revoked' });
    }

    // Remove peer from WireGuard
    try {
      disablePeer(deviceData.public_key);
    } catch (wgError) {
      console.error('WireGuard disable error:', wgError.message);
    }

    // Update status in Firestore
    await deviceRef.update({
      status: 'disabled',
      disabled_at: new Date().toISOString(),
    });

    res.json({
      message: 'Device disabled successfully',
      device_id: id,
      device_name: deviceData.device_name,
      ip_address: deviceData.ip_address,
      status: 'disabled'
    });
  } catch (error) {
    console.error('Disable device error:', error.message);
    res.status(500).json({ error: 'Failed to disable device', details: error.message });
  }
});

// Reactivate device (admin) - restore disabled device
router.post('/device/:id/reactivate', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
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
        current_status: deviceData.status
      });
    }

    // Add peer back to WireGuard
    try {
      reactivatePeer(deviceData.public_key, deviceData.ip_address);
    } catch (wgError) {
      console.error('WireGuard reactivate error:', wgError.message);
      return res.status(500).json({
        error: 'Failed to reactivate WireGuard peer',
        details: wgError.message
      });
    }

    // Update status in Firestore
    await deviceRef.update({
      status: 'active',
      reactivated_at: new Date().toISOString(),
    });

    res.json({
      message: 'Device reactivated successfully',
      device_id: id,
      device_name: deviceData.device_name,
      ip_address: deviceData.ip_address,
      status: 'active'
    });
  } catch (error) {
    console.error('Reactivate device error:', error.message);
    res.status(500).json({ error: 'Failed to reactivate device', details: error.message });
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
