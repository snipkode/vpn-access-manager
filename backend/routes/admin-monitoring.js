import express from 'express';
import { getAllMetrics } from '../services/systemMetrics.js';
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
 * /api/admin/monitoring/metrics:
 *   get:
 *     summary: Get current system metrics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics
 */
router.get('/metrics', verifyAdmin, async (req, res) => {
  try {
    const metrics = getAllMetrics();
    res.json({ metrics });
  } catch (error) {
    console.error('Get metrics error:', error.message);
    res.status(500).json({ error: 'Failed to get metrics', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/monitoring/health:
 *   get:
 *     summary: Get system health status
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health status
 */
router.get('/health', verifyAdmin, async (req, res) => {
  try {
    const metrics = getAllMetrics();
    
    // Calculate health score
    let healthScore = 100;
    let status = 'healthy';
    const issues = [];

    // CPU check
    if (metrics.cpu.usage_percent > 90) {
      healthScore -= 30;
      issues.push({ type: 'cpu', severity: 'critical', value: metrics.cpu.usage_percent });
    } else if (metrics.cpu.usage_percent > 70) {
      healthScore -= 15;
      issues.push({ type: 'cpu', severity: 'warning', value: metrics.cpu.usage_percent });
    }

    // Memory check
    if (metrics.memory.usage_percent > 90) {
      healthScore -= 30;
      issues.push({ type: 'memory', severity: 'critical', value: metrics.memory.usage_percent });
    } else if (metrics.memory.usage_percent > 70) {
      healthScore -= 15;
      issues.push({ type: 'memory', severity: 'warning', value: metrics.memory.usage_percent });
    }

    // Disk check
    for (const disk of metrics.disk) {
      if (disk.usage_percent > 90) {
        healthScore -= 20;
        issues.push({ type: 'disk', severity: 'critical', mount: disk.mount_point, value: disk.usage_percent });
      } else if (disk.usage_percent > 70) {
        healthScore -= 10;
        issues.push({ type: 'disk', severity: 'warning', mount: disk.mount_point, value: disk.usage_percent });
      }
    }

    // Determine status
    if (healthScore >= 80) {
      status = 'healthy';
    } else if (healthScore >= 50) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    res.json({
      health_score: healthScore,
      status,
      issues,
      metrics: {
        cpu: metrics.cpu.usage_percent,
        memory: metrics.memory.usage_percent,
        disk: metrics.disk.map(d => ({ mount: d.mount_point, usage: d.usage_percent })),
        uptime: metrics.uptime
      }
    });
  } catch (error) {
    console.error('Get health error:', error.message);
    res.status(500).json({ error: 'Failed to get health status', details: error.message });
  }
});

export default router;
