/**
 * Auth Routes - MySQL Implementation
 * Login, Register, Logout endpoints
 */

import express from 'express';
import { register, login, getUserById, updatePassword, authMiddleware } from '../services/auth-mysql.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *       400:
 *         description: User already exists
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await register({ email, password, name });
    res.json(result);
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await login(email, password);
    
    // Update last login
    const { User } = await import('../models/index.js');
    await User.update(
      { last_login: new Date() },
      { where: { id: result.user.id } }
    );

    res.json(result);
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(404).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required' });
    }

    const result = await updatePassword(req.user.id, oldPassword, newPassword);
    res.json(result);
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;
