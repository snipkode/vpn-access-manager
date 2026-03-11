/**
 * Admin Routes - MySQL Implementation
 * Drop-in replacement for admin.js when using MySQL
 */
import express from 'express';
import { auth } from '../config/firebase.js';
import { User, Device } from '../models/index.js';
import { 
  getUsers as getMySQLUsers, 
  getUserById as getMySQLUserById,
  updateUser as updateMySQLUser,
  deleteUser as deleteMySQLUser,
  toggleVpnAccess as toggleMySQLVpnAccess,
  getDashboardStats as getMySQLDashboardStats
} from '../services/user-mysql.js';
import {
  getDevices as getMySQLDevices,
  getDeviceById as getMySQLDeviceById,
  deleteDevice as deleteMySQLDevice,
  updateDevice as updateMySQLDevice,
  getDeviceStats as getMySQLDeviceStats
} from '../services/device-mysql.js';
import {
  getAllRules as getMySQLRules,
  getActiveRules as getMySQLActiveRules,
  createRule as createMySQLRule,
  updateRule as updateMySQLRule,
  deleteRule as deleteMySQLRule,
  toggleRule as toggleMySQLRule,
  getAccessStats as getMySQLAccessStats,
  getAccessAttempts as getMySQLAccessAttempts,
  getSuspiciousActivity as getMySQLSuspiciousActivity
} from '../services/firewall-mysql.js';

const router = express.Router();

// Middleware to verify admin (same as original)
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    const user = await User.findByPk(decodedToken.uid);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Admin auth error:', error.message);
    if (error.code === 'auth/id-token-expired' || error.message.includes('expired')) {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const result = await getMySQLDashboardStats();
    res.json(result.stats);
  } catch (error) {
    console.error('Get stats error:', error.message);
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const result = await getMySQLUsers(req.query);
    res.json({ users: result.users, total: result.total });
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({ error: 'Failed to get users', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users/:id:
 *   get:
 *     summary: Get user by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 */
router.get('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const result = await getMySQLUserById(req.params.id);
    res.json({ user: result.user });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(error.message === 'User not found' ? 404 : 500).json({ 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/users/:id:
 *   patch:
 *     summary: Update user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User updated
 */
router.patch('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { vpn_enabled } = req.body;
    
    if (vpn_enabled !== undefined) {
      const result = await toggleMySQLVpnAccess(req.params.id, vpn_enabled);
      return res.json(result);
    }

    const result = await updateMySQLUser(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Update user error:', error.message);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users/:id:
 *   delete:
 *     summary: Delete user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const result = await deleteMySQLUser(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/devices:
 *   get:
 *     summary: Get all devices
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of devices
 */
router.get('/devices', verifyAdmin, async (req, res) => {
  try {
    const result = await getMySQLDevices(req.query);
    res.json({ devices: result.devices, total: result.total });
  } catch (error) {
    console.error('Get devices error:', error.message);
    res.status(500).json({ error: 'Failed to get devices', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/device/:id:
 *   delete:
 *     summary: Delete device
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Device deleted
 */
router.delete('/device/:id', verifyAdmin, async (req, res) => {
  try {
    const result = await deleteMySQLDevice(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Delete device error:', error.message);
    res.status(500).json({ error: 'Failed to delete device', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/rules:
 *   get:
 *     summary: Get all firewall rules
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of firewall rules
 */
router.get('/firewall/rules', verifyAdmin, async (req, res) => {
  try {
    const result = await getMySQLRules();
    res.json(result);
  } catch (error) {
    console.error('Get firewall rules error:', error.message);
    res.status(500).json({ error: 'Failed to get firewall rules', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/access-stats:
 *   get:
 *     summary: Get access statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access statistics
 */
router.get('/firewall/access-stats', verifyAdmin, async (req, res) => {
  try {
    const result = await getMySQLAccessStats();
    res.json(result.stats);
  } catch (error) {
    console.error('Get access stats error:', error.message);
    res.status(500).json({ error: 'Failed to get access stats', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/access-attempts:
 *   get:
 *     summary: Get access attempts
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access attempts
 */
router.get('/firewall/access-attempts', verifyAdmin, async (req, res) => {
  try {
    const result = await getMySQLAccessAttempts(req.query.limit, req.query);
    res.json(result);
  } catch (error) {
    console.error('Get access attempts error:', error.message);
    res.status(500).json({ error: 'Failed to get access attempts', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/suspicious-activity:
 *   get:
 *     summary: Get suspicious activity
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suspicious activity
 */
router.get('/firewall/suspicious-activity', verifyAdmin, async (req, res) => {
  try {
    const result = await getMySQLSuspiciousActivity();
    res.json(result);
  } catch (error) {
    console.error('Get suspicious activity error:', error.message);
    res.status(500).json({ error: 'Failed to get suspicious activity', details: error.message });
  }
});

export default router;
