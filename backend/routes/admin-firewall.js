import express from 'express';
import {
  getAllRules,
  getActiveRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  getIptablesStatus,
  syncRules,
  getUsedIPsMap,
  checkIPOverlap,
  getBlockedPorts,
  isPortBlocked,
  getIPConflictReport
} from '../services/firewall.js';
import {
  analyzeOpenPorts,
  getPublicPorts,
  isPortPublic,
  scanListeningPorts
} from '../services/systemPortScanner.js';
import {
  getRecentAccessAttempts,
  getAccessStats,
  getSuspiciousActivity,
  blockIPAddress,
  unblockIPAddress,
  getBlockedIPs
} from '../services/accessMonitor.js';
import { db } from '../config/firebase.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Firewall
 *   description: Firewall rule management (Admin only)
 */

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
 * /api/admin/firewall/devices:
 *   get:
 *     summary: Get all devices with IP addresses (for IP selection)
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of devices with IP addresses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 devices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       device_name: { type: string }
 *                       ip_address: { type: string }
 *                       user_email: { type: string }
 */
router.get('/devices', verifyAdmin, async (req, res) => {
  try {
    const devicesSnapshot = await db.collection('devices')
      .where('status', '==', 'active')
      .get();
    
    const devices = [];
    const userCache = new Map();
    
    for (const doc of devicesSnapshot.docs) {
      const deviceData = doc.data();
      
      // Get user email for display
      let userEmail = 'Unknown';
      if (deviceData.user_id) {
        if (userCache.has(deviceData.user_id)) {
          userEmail = userCache.get(deviceData.user_id);
        } else {
          const userDoc = await db.collection('users').doc(deviceData.user_id).get();
          if (userDoc.exists) {
            userEmail = userDoc.data().email || 'Unknown';
            userCache.set(deviceData.user_id, userEmail);
          }
        }
      }
      
      devices.push({
        id: doc.id,
        device_name: deviceData.device_name,
        ip_address: deviceData.ip_address,
        user_email: userEmail,
        user_id: deviceData.user_id
      });
    }
    
    // Sort by IP address
    devices.sort((a, b) => {
      const ipA = a.ip_address.split('.').map(Number);
      const ipB = b.ip_address.split('.').map(Number);
      for (let i = 0; i < 4; i++) {
        if (ipA[i] !== ipB[i]) return ipA[i] - ipB[i];
      }
      return 0;
    });
    
    console.log(`[Firewall] Retrieved ${devices.length} devices for IP selection`);
    res.json({ devices });
  } catch (error) {
    console.error('Get devices for firewall error:', error.message);
    res.status(500).json({ error: 'Failed to get devices', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/validate-ips:
 *   post:
 *     summary: Validate IPs for overlap with existing rules
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ips:
 *                 type: array
 *                 items: { type: string }
 *               ip_range:
 *                 type: string
 *               ip_type:
 *                 type: string
 *                 enum: [range, individual]
 *     responses:
 *       200:
 *         description: Validation result
 */
router.post('/validate-ips', verifyAdmin, async (req, res) => {
  try {
    const { ips, ip_range, ip_type = 'individual' } = req.body;
    
    let ipsToCheck = ips || [];
    
    if (ip_type === 'range' && ip_range) {
      const { parseIPRange, generateIPRange } = await import('../services/firewall.js');
      const { start, end } = parseIPRange(ip_range);
      ipsToCheck = generateIPRange(start, end);
    }
    
    const overlapCheck = await checkIPOverlap(ipsToCheck);
    
    res.json({
      has_overlap: overlapCheck.has_overlap,
      overlaps: overlapCheck.overlaps,
      clean_ips: overlapCheck.clean_ips,
      total_ips: ipsToCheck.length,
      available_ips: overlapCheck.clean_ips.length,
      blocked_ips: overlapCheck.overlaps.length
    });
  } catch (error) {
    console.error('Validate IPs error:', error.message);
    res.status(500).json({ error: 'Failed to validate IPs', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/ip-usage:
 *   get:
 *     summary: Get IP usage map (which IPs are used by which rules)
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: IP usage map
 */
router.get('/ip-usage', verifyAdmin, async (req, res) => {
  try {
    const ipMap = await getUsedIPsMap();
    
    // Convert Map to object for JSON response
    const ipUsage = {};
    ipMap.forEach((value, ip) => {
      ipUsage[ip] = value;
    });
    
    res.json({
      ip_usage: ipUsage,
      total_used_ips: ipMap.size
    });
  } catch (error) {
    console.error('Get IP usage error:', error.message);
    res.status(500).json({ error: 'Failed to get IP usage', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/blocked-ports:
 *   get:
 *     summary: Get list of blocked/reserved ports
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of blocked ports
 */
router.get('/blocked-ports', verifyAdmin, async (req, res) => {
  try {
    const blockedPorts = getBlockedPorts();
    res.json({ blocked_ports: blockedPorts });
  } catch (error) {
    console.error('Get blocked ports error:', error.message);
    res.status(500).json({ error: 'Failed to get blocked ports', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/validate-port:
 *   post:
 *     summary: Validate if a port is allowed
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               port:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Port validation result
 */
router.post('/validate-port', verifyAdmin, async (req, res) => {
  try {
    const { port } = req.body;
    const portNum = parseInt(port, 10);
    
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({
        valid: false,
        blocked: false,
        message: 'Port must be between 1 and 65535'
      });
    }
    
    const portCheck = isPortBlocked(portNum);
    
    res.json({
      valid: !portCheck.blocked,
      blocked: portCheck.blocked,
      port: portNum,
      reason: portCheck.reason
    });
  } catch (error) {
    console.error('Validate port error:', error.message);
    res.status(500).json({ error: 'Failed to validate port', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/open-ports:
 *   get:
 *     summary: Get all currently open ports (from firewall rules)
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of open ports
 */
router.get('/open-ports', verifyAdmin, async (req, res) => {
  try {
    const activeRules = await getActiveRules();
    
    // Extract unique ports from active rules
    const portMap = new Map();
    
    for (const rule of activeRules) {
      if (!portMap.has(rule.port)) {
        portMap.set(rule.port, {
          port: rule.port,
          rules: [],
          protocols: new Set()
        });
      }
      
      const portData = portMap.get(rule.port);
      portData.rules.push({
        id: rule.id,
        name: rule.name,
        action: rule.action
      });
      
      if (rule.protocol === 'both') {
        portData.protocols.add('tcp');
        portData.protocols.add('udp');
      } else {
        portData.protocols.add(rule.protocol);
      }
    }
    
    // Convert to array
    const openPorts = Array.from(portMap.values()).map(p => ({
      port: p.port,
      rule_count: p.rules.length,
      rules: p.rules,
      protocols: Array.from(p.protocols)
    }));
    
    // Sort by port number
    openPorts.sort((a, b) => a.port - b.port);
    
    res.json({
      open_ports: openPorts,
      total_ports: openPorts.length
    });
  } catch (error) {
    console.error('Get open ports error:', error.message);
    res.status(500).json({ error: 'Failed to get open ports', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/system-ports:
 *   get:
 *     summary: Scan system for open ports (from netstat/ss)
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System port analysis
 */
router.get('/system-ports', verifyAdmin, async (req, res) => {
  try {
    const analysis = analyzeOpenPorts();
    res.json(analysis);
  } catch (error) {
    console.error('Scan system ports error:', error.message);
    res.status(500).json({ error: 'Failed to scan system ports', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/public-ports:
 *   get:
 *     summary: Get ports open to public (0.0.0.0/0)
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of public ports
 */
router.get('/public-ports', verifyAdmin, async (req, res) => {
  try {
    const publicPorts = getPublicPorts();
    res.json({
      public_ports: publicPorts,
      total: publicPorts.length
    });
  } catch (error) {
    console.error('Get public ports error:', error.message);
    res.status(500).json({ error: 'Failed to get public ports', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/bulk-delete:
 *   post:
 *     summary: Bulk delete firewall rules by port or IDs
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rule_ids:
 *                 type: array
 *                 items: { type: string }
 *               ports:
 *                 type: array
 *                 items: { type: integer }
 *     responses:
 *       200:
 *         description: Bulk delete result
 */
router.post('/bulk-delete', verifyAdmin, async (req, res) => {
  try {
    const { rule_ids, ports } = req.body;
    const results = {
      deleted: [],
      failed: [],
      total_attempted: 0
    };
    
    // Delete by rule IDs
    if (rule_ids && Array.isArray(rule_ids)) {
      results.total_attempted += rule_ids.length;
      
      for (const ruleId of rule_ids) {
        try {
          await deleteRule(ruleId);
          results.deleted.push({ rule_id: ruleId, success: true });
        } catch (error) {
          results.failed.push({ rule_id: ruleId, error: error.message });
        }
      }
    }
    
    // Delete by ports (delete all rules for specified ports)
    if (ports && Array.isArray(ports)) {
      const activeRules = await getActiveRules();
      
      for (const port of ports) {
        const rulesForPort = activeRules.filter(r => r.port === port);
        results.total_attempted += rulesForPort.length;
        
        for (const rule of rulesForPort) {
          try {
            await deleteRule(rule.id);
            results.deleted.push({ rule_id: rule.id, port, success: true });
          } catch (error) {
            results.failed.push({ rule_id: rule.id, port, error: error.message });
          }
        }
      }
    }
    
    res.json({
      message: `Bulk delete completed: ${results.deleted.length} deleted, ${results.failed.length} failed`,
      results
    });
  } catch (error) {
    console.error('Bulk delete error:', error.message);
    res.status(500).json({ error: 'Failed to bulk delete', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/rules/:id/impact:
 *   get:
 *     summary: Get delete impact for a rule (which IPs will be freed)
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Delete impact analysis
 */
router.get('/rules/:id/impact', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await getRuleById(id);
    
    // Get IPs that will be freed
    let affectedIPs = [];
    if (rule.ip_type === 'individual' && rule.ips) {
      affectedIPs = rule.ips;
    } else if (rule.ip_type === 'range' && rule.ip_range) {
      const { parseIPRange, generateIPRange } = await import('../services/firewall.js');
      const { start, end } = parseIPRange(rule.ip_range);
      affectedIPs = generateIPRange(start, end);
    }
    
    // Get devices that use these IPs
    const devicesSnapshot = await db.collection('devices')
      .where('status', '==', 'active')
      .get();
    
    const affectedDevices = [];
    for (const doc of devicesSnapshot.docs) {
      const deviceData = doc.data();
      if (affectedIPs.includes(deviceData.ip_address)) {
        affectedDevices.push({
          id: doc.id,
          device_name: deviceData.device_name,
          ip_address: deviceData.ip_address
        });
      }
    }
    
    res.json({
      rule_id: id,
      rule_name: rule.name,
      affected_ips: affectedIPs,
      affected_ip_count: affectedIPs.length,
      affected_devices,
      affected_device_count: affectedDevices.length
    });
  } catch (error) {
    console.error('Get delete impact error:', error.message);
    if (error.message === 'Rule not found') {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.status(500).json({ error: 'Failed to get delete impact', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/rules:
 *   get:
 *     summary: Get all firewall rules
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of firewall rules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rules:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       port: { type: integer }
 *                       protocol: { type: string }
 *                       ip_range: { type: string }
 *                       action: { type: string }
 *                       enabled: { type: boolean }
 *                       ip_count: { type: integer }
 */
router.get('/rules', verifyAdmin, async (req, res) => {
  try {
    const { active } = req.query;
    
    let rules;
    if (active === 'true') {
      rules = await getActiveRules();
    } else {
      rules = await getAllRules();
    }

    console.log(`[Firewall] Retrieved ${rules.length} rules`);
    res.json({ rules });
  } catch (error) {
    console.error('Get firewall rules error:', error.message);
    res.status(500).json({ error: 'Failed to get firewall rules', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/rules/:id:
 *   get:
 *     summary: Get firewall rule by ID
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rule ID
 *     responses:
 *       200:
 *         description: Firewall rule details
 *       404:
 *         description: Rule not found
 */
router.get('/rules/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await getRuleById(id);
    res.json({ rule });
  } catch (error) {
    console.error('Get firewall rule error:', error.message);
    if (error.message === 'Rule not found') {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.status(500).json({ error: 'Failed to get firewall rule', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/rules:
 *   post:
 *     summary: Create new firewall rule
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - port
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Allow SSH from office"
 *               port:
 *                 type: integer
 *                 example: 22
 *               protocol:
 *                 type: string
 *                 enum: [tcp, udp, both]
 *                 example: tcp
 *               ip_type:
 *                 type: string
 *                 enum: [range, individual]
 *                 example: individual
 *               ips:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["10.0.0.3", "10.0.0.5", "10.0.0.7"]
 *               ip_range:
 *                 type: string
 *                 example: "10.0.0.3-10.0.0.10"
 *               action:
 *                 type: string
 *                 enum: [allow, deny]
 *                 example: allow
 *               description:
 *                 type: string
 *                 example: "Allow office network to access SSH"
 *     responses:
 *       201:
 *         description: Firewall rule created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/rules', verifyAdmin, async (req, res) => {
  try {
    const ruleData = req.body;
    console.log('[Firewall] Creating rule:', ruleData);
    
    const rule = await createRule(ruleData);
    console.log(`[Firewall] Rule created: ${rule.id}`);
    
    res.status(201).json({
      message: 'Firewall rule created successfully',
      rule
    });
  } catch (error) {
    console.error('Create firewall rule error:', error.message);
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create firewall rule', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/rules/:id:
 *   put:
 *     summary: Update firewall rule
 *     tags: [Firewall]
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
 *               name:
 *                 type: string
 *               port:
 *                 type: integer
 *               protocol:
 *                 type: string
 *               ip_range:
 *                 type: string
 *               action:
 *                 type: string
 *               description:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Firewall rule updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Rule not found
 */
router.put('/rules/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ruleData = req.body;
    
    console.log('[Firewall] Updating rule:', id, ruleData);
    const rule = await updateRule(id, ruleData);
    
    res.json({
      message: 'Firewall rule updated successfully',
      rule
    });
  } catch (error) {
    console.error('Update firewall rule error:', error.message);
    if (error.message === 'Rule not found') {
      return res.status(404).json({ error: 'Rule not found' });
    }
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update firewall rule', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/rules/:id:
 *   delete:
 *     summary: Delete firewall rule
 *     tags: [Firewall]
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
 *         description: Firewall rule deleted successfully
 *       404:
 *         description: Rule not found
 */
router.delete('/rules/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[Firewall] Deleting rule:', id);
    const result = await deleteRule(id);
    
    res.json(result);
  } catch (error) {
    console.error('Delete firewall rule error:', error.message);
    if (error.message === 'Rule not found') {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.status(500).json({ error: 'Failed to delete firewall rule', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/rules/:id/toggle:
 *   post:
 *     summary: Toggle firewall rule enabled/disabled
 *     tags: [Firewall]
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
 *         description: Firewall rule toggled successfully
 *       404:
 *         description: Rule not found
 */
router.post('/rules/:id/toggle', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[Firewall] Toggling rule:', id);
    const rule = await toggleRule(id);
    
    res.json({
      message: `Firewall rule ${rule.enabled ? 'enabled' : 'disabled'} successfully`,
      rule
    });
  } catch (error) {
    console.error('Toggle firewall rule error:', error.message);
    if (error.message === 'Rule not found') {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.status(500).json({ error: 'Failed to toggle firewall rule', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/status:
 *   get:
 *     summary: Get iptables status
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: iptables status
 */
router.get('/status', verifyAdmin, async (req, res) => {
  try {
    const status = await getIptablesStatus();
    res.json({ status });
  } catch (error) {
    console.error('Get iptables status error:', error.message);
    res.status(500).json({ error: 'Failed to get iptables status', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/sync:
 *   post:
 *     summary: Sync database rules with iptables
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Firewall rules synced successfully
 */
router.post('/sync', verifyAdmin, async (req, res) => {
  try {
    console.log('[Firewall] Syncing rules with iptables');
    const result = await syncRules();

    res.json(result);
  } catch (error) {
    console.error('Sync firewall rules error:', error.message);
    res.status(500).json({ error: 'Failed to sync firewall rules', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/conflict-report:
 *   post:
 *     summary: Get detailed IP conflict report
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ip_type:
 *                 type: string
 *                 enum: [range, individual, department]
 *               ip_range:
 *                 type: string
 *               ips:
 *                 type: array
 *               department_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conflict report
 */
router.post('/conflict-report', verifyAdmin, async (req, res) => {
  try {
    const inputData = req.body;
    const report = await getIPConflictReport(inputData);
    res.json({ report });
  } catch (error) {
    console.error('Get conflict report error:', error.message);
    res.status(500).json({ error: 'Failed to get conflict report', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/access-stats:
 *   get:
 *     summary: Get access attempt statistics
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access statistics
 */
router.get('/access-stats', verifyAdmin, async (req, res) => {
  try {
    const stats = await getAccessStats();
    res.json({ stats });
  } catch (error) {
    console.error('Get access stats error:', error.message);
    // Return empty stats if collection doesn't exist yet
    res.json({ 
      stats: {
        total: 0,
        blocked: 0,
        allowed: 0,
        by_port: {},
        by_source_ip: {},
        top_blocked_ips: [],
        top_targeted_ports: []
      }
    });
  }
});

/**
 * @swagger
 * /api/admin/firewall/access-attempts:
 *   get:
 *     summary: Get recent access attempts
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [blocked, allowed]
 *     responses:
 *       200:
 *         description: Recent access attempts
 */
router.get('/access-attempts', verifyAdmin, async (req, res) => {
  try {
    const { limit = '100', filter } = req.query;
    const attempts = await getRecentAccessAttempts(parseInt(limit), filter);
    res.json({ attempts });
  } catch (error) {
    console.error('Get access attempts error:', error.message);
    res.status(500).json({ error: 'Failed to get access attempts', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/suspicious-activity:
 *   get:
 *     summary: Get suspicious activity report
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suspicious activity report
 */
router.get('/suspicious-activity', verifyAdmin, async (req, res) => {
  try {
    const suspicious = await getSuspiciousActivity();
    res.json({ suspicious });
  } catch (error) {
    console.error('Get suspicious activity error:', error.message);
    res.status(500).json({ error: 'Failed to get suspicious activity', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/block-ip:
 *   post:
 *     summary: Block an IP address
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ip_address
 *             properties:
 *               ip_address:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: IP blocked successfully
 */
router.post('/block-ip', verifyAdmin, async (req, res) => {
  try {
    const { ip_address, reason = 'Manual block by admin' } = req.body;
    const success = await blockIPAddress(ip_address, reason);
    res.json({ success, message: success ? 'IP blocked successfully' : 'Failed to block IP' });
  } catch (error) {
    console.error('Block IP error:', error.message);
    res.status(500).json({ error: 'Failed to block IP', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/unblock-ip:
 *   post:
 *     summary: Unblock an IP address
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ip_address
 *             properties:
 *               ip_address:
 *                 type: string
 *     responses:
 *       200:
 *         description: IP unblocked successfully
 */
router.post('/unblock-ip', verifyAdmin, async (req, res) => {
  try {
    const { ip_address } = req.body;
    const success = await unblockIPAddress(ip_address);
    res.json({ success, message: success ? 'IP unblocked successfully' : 'Failed to unblock IP' });
  } catch (error) {
    console.error('Unblock IP error:', error.message);
    res.status(500).json({ error: 'Failed to unblock IP', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/blocked-ips:
 *   get:
 *     summary: Get list of blocked IPs
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of blocked IPs
 */
router.get('/blocked-ips', verifyAdmin, async (req, res) => {
  try {
    const blockedIPs = await getBlockedIPs();
    res.json({ blocked_ips: blockedIPs });
  } catch (error) {
    console.error('Get blocked IPs error:', error.message);
    res.status(500).json({ error: 'Failed to get blocked IPs', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/firewall/ip-pool:
 *   get:
 *     summary: Get IP pool status for WireGuard subnet
 *     tags: [Firewall]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: IP pool status
 */
router.get('/ip-pool', verifyAdmin, async (req, res) => {
  try {
    const { generateIPRange, getUsedIPsMap } = await import('../services/firewall.js');
    
    // Get subnet from env (default: 10.0.0.0/24)
    const WG_SUBNET = process.env.WG_SUBNET || '10.0.0.0/24';
    const [baseIP, cidr] = WG_SUBNET.split('/');
    const baseParts = baseIP.split('.').map(Number);
    
    // Generate all IPs in subnet
    const totalIPs = Math.pow(2, 32 - parseInt(cidr)) - 2; // Exclude network and broadcast
    const allIPs = generateIPRange(
      `${baseParts[0]}.${baseParts[1]}.${baseParts[2]}.1`,
      `${baseParts[0]}.${baseParts[1]}.${baseParts[2]}.${totalIPs}`
    );
    
    // Get used IPs
    const usedIPsMap = await getUsedIPsMap();
    const usedIPs = Array.from(usedIPsMap.keys());
    
    // Calculate available IPs
    const availableIPs = allIPs.filter(ip => !usedIPsMap.has(ip));
    
    // Get devices with IPs
    const devicesSnapshot = await db.collection('devices')
      .where('status', '==', 'active')
      .get();
    
    const deviceIPs = [];
    devicesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.ip_address) {
        deviceIPs.push({
          id: doc.id,
          ip: data.ip_address,
          device_name: data.device_name,
          user_id: data.user_id
        });
      }
    });
    
    // Get user emails for display
    const userCache = new Map();
    for (const device of deviceIPs) {
      if (!userCache.has(device.user_id)) {
        const userDoc = await db.collection('users').doc(device.user_id).get();
        userCache.set(device.user_id, userDoc.exists ? userDoc.data().email : 'Unknown');
      }
      device.user_email = userCache.get(device.user_id);
    }
    
    // Calculate usage percentage
    const usagePercent = Math.round((usedIPs.length / totalIPs) * 100 * 100) / 100;
    
    res.json({
      subnet: WG_SUBNET,
      total_ips: totalIPs,
      used_ips: usedIPs.length,
      available_ips: availableIPs.length,
      usage_percent: usagePercent,
      used_ip_list: usedIPs,
      available_ip_list: availableIPs.slice(0, 50), // First 50 for preview
      device_assignments: deviceIPs,
      risk_level: usagePercent > 80 ? 'high' : usagePercent > 60 ? 'medium' : 'low'
    });
  } catch (error) {
    console.error('Get IP pool error:', error.message);
    res.status(500).json({ error: 'Failed to get IP pool', details: error.message });
  }
});

export default router;
