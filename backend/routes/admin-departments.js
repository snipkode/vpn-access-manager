import express from 'express';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  addDeviceToDepartment,
  removeDeviceFromDepartment,
  getDevicesByDepartment,
  getDepartmentIPs,
  getDeviceDepartment
} from '../services/department.js';
import { db } from '../config/firebase.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department/Division management for firewall groups
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
 * /api/admin/departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of departments
 */
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const departments = await getAllDepartments();
    res.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error.message);
    res.status(500).json({ error: 'Failed to get departments', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/departments/grouped:
 *   get:
 *     summary: Get devices grouped by department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Devices grouped by department
 */
router.get('/grouped', verifyAdmin, async (req, res) => {
  try {
    const result = await getDevicesByDepartment();
    res.json(result);
  } catch (error) {
    console.error('Get grouped devices error:', error.message);
    res.status(500).json({ error: 'Failed to get grouped devices', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/departments/:id:
 *   get:
 *     summary: Get department by ID
 *     tags: [Departments]
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
 *         description: Department details
 */
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const department = await getDepartmentById(id);
    res.json({ department });
  } catch (error) {
    console.error('Get department error:', error.message);
    if (error.message === 'Department not found') {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.status(500).json({ error: 'Failed to get department', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/departments:
 *   post:
 *     summary: Create new department
 *     tags: [Departments]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               devices:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Department created
 */
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const departmentData = req.body;
    const department = await createDepartment(departmentData);
    res.status(201).json({
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    console.error('Create department error:', error.message);
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create department', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/departments/:id:
 *   put:
 *     summary: Update department
 *     tags: [Departments]
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
 *               description:
 *                 type: string
 *               devices:
 *                 type: array
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Department updated
 */
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const departmentData = req.body;
    const department = await updateDepartment(id, departmentData);
    res.json({
      message: 'Department updated successfully',
      department
    });
  } catch (error) {
    console.error('Update department error:', error.message);
    if (error.message === 'Department not found') {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.status(500).json({ error: 'Failed to update department', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/departments/:id:
 *   delete:
 *     summary: Delete department
 *     tags: [Departments]
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
 *         description: Department deleted
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteDepartment(id);
    res.json(result);
  } catch (error) {
    console.error('Delete department error:', error.message);
    if (error.message === 'Department not found') {
      return res.status(404).json({ error: 'Department not found' });
    }
    if (error.message.includes('firewall rule')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete department', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/departments/:id/devices:
 *   post:
 *     summary: Add device to department
 *     tags: [Departments]
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
 *             required:
 *               - device_id
 *     responses:
 *       200:
 *         description: Device added
 */
router.post('/:id/devices', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { device_id } = req.body;
    
    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }
    
    const result = await addDeviceToDepartment(id, device_id);
    res.json({
      message: 'Device added to department',
      result
    });
  } catch (error) {
    console.error('Add device error:', error.message);
    if (error.message.includes('not found') || error.message.includes('already')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to add device', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/departments/:id/devices/:deviceId:
 *   delete:
 *     summary: Remove device from department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device removed
 */
router.delete('/:id/devices/:deviceId', verifyAdmin, async (req, res) => {
  try {
    const { id, deviceId } = req.params;
    const result = await removeDeviceFromDepartment(id, deviceId);
    res.json({
      message: 'Device removed from department',
      result
    });
  } catch (error) {
    console.error('Remove device error:', error.message);
    res.status(500).json({ error: 'Failed to remove device', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/departments/:id/ips:
 *   get:
 *     summary: Get all IPs from department
 *     tags: [Departments]
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
 *         description: List of IPs
 */
router.get('/:id/ips', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ips = await getDepartmentIPs(id);
    res.json({ 
      department_id: id,
      ips,
      total: ips.length
    });
  } catch (error) {
    console.error('Get department IPs error:', error.message);
    res.status(500).json({ error: 'Failed to get department IPs', details: error.message });
  }
});

/**
 * @swagger
 * /api/admin/devices/:deviceId/department:
 *   get:
 *     summary: Get department assignment for a device
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department assignment info
 */
router.get('/devices/:deviceId/department', verifyAdmin, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await getDeviceDepartment(deviceId);
    res.json(result);
  } catch (error) {
    console.error('Get device department error:', error.message);
    res.status(500).json({ error: 'Failed to get device department', details: error.message });
  }
});

export default router;
