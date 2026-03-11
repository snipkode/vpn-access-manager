import express from 'express';
import {
  getBlockedPortsSettings,
  addBlockedPort,
  updateBlockedPort,
  deleteBlockedPort,
  toggleBlockedPort,
  isPortBlockedDynamic,
  getBlockedPortsList
} from '../services/blockedPortsSettings.js';
import { db } from '../config/firebase.js';

const router = express.Router();

// Middleware to verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const { auth } = await import('../config/firebase.js');
    const decodedToken = await auth.verifyIdToken(token);

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Admin auth error:', error.message);
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

/**
 * @swagger
 * /api/admin/settings/blocked-ports:
 *   get:
 *     summary: Get all blocked ports settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of blocked ports
 */
router.get('/blocked-ports', verifyAdmin, async (req, res) => {
  try {
    const ports = await getBlockedPortsSettings();
    res.json({ blocked_ports: ports });
  } catch (error) {
    console.error('Get blocked ports error:', error.message);
    res.status(500).json({ error: 'Failed to get blocked ports', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/settings/blocked-ports:
 *   post:
 *     summary: Add new blocked port
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - port
 *               - reason
 *             properties:
 *               port:
 *                 type: integer
 *               reason:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [danger, warning]
 *     responses:
 *       201:
 *         description: Blocked port added
 */
router.post('/blocked-ports', verifyAdmin, async (req, res) => {
  try {
    const portData = req.body;
    const result = await addBlockedPort(portData);
    res.status(201).json({
      message: 'Blocked port added successfully',
      port: result
    });
  } catch (error) {
    console.error('Add blocked port error:', error.message);
    if (error.message.includes('already') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to add blocked port', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/settings/blocked-ports/:id:
 *   put:
 *     summary: Update blocked port
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               port:
 *                 type: integer
 *               reason:
 *                 type: string
 *               level:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Blocked port updated
 */
router.put('/blocked-ports/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const portData = req.body;
    const result = await updateBlockedPort(id, portData);
    res.json({
      message: 'Blocked port updated successfully',
      port: result
    });
  } catch (error) {
    console.error('Update blocked port error:', error.message);
    if (error.message === 'Blocked port not found') {
      return res.status(404).json({ error: 'Blocked port not found' });
    }
    res.status(500).json({ error: 'Failed to update blocked port', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/settings/blocked-ports/:id:
 *   delete:
 *     summary: Delete blocked port
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blocked port deleted
 */
router.delete('/blocked-ports/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteBlockedPort(id);
    res.json({ message: 'Blocked port deleted successfully' });
  } catch (error) {
    console.error('Delete blocked port error:', error.message);
    if (error.message.includes('not found') || error.message.includes('Cannot delete')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete blocked port', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/settings/blocked-ports/:id/toggle:
 *   post:
 *     summary: Toggle blocked port enabled/disabled
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blocked port toggled
 */
router.post('/blocked-ports/:id/toggle', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await toggleBlockedPort(id);
    res.json({
      message: `Blocked port ${result.enabled ? 'enabled' : 'disabled'} successfully`,
      port: result
    });
  } catch (error) {
    console.error('Toggle blocked port error:', error.message);
    if (error.message === 'Blocked port not found') {
      return res.status(404).json({ error: 'Blocked port not found' });
    }
    res.status(500).json({ error: 'Failed to toggle blocked port', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/settings/blocked-ports/validate:
 *   post:
 *     summary: Validate if a port is blocked
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - port
 *             properties:
 *               port:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Validation result
 */
router.post('/blocked-ports/validate', verifyAdmin, async (req, res) => {
  try {
    const { port } = req.body;
    const result = await isPortBlockedDynamic(port);
    res.json(result);
  } catch (error) {
    console.error('Validate blocked port error:', error.message);
    res.status(500).json({ error: 'Failed to validate port', details: error.message });
  }
});

export default router;
