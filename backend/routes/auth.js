import express from 'express';
import { auth, db } from '../config/firebase.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user verification endpoints
 */

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify Firebase token and get/create user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Firebase ID token
 *     responses:
 *       200:
 *         description: User verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     uid: { type: string }
 *                     email: { type: string }
 *                     role: { type: string }
 *                     vpn_enabled: { type: boolean }
 *                 token:
 *                   type: object
 *       400:
 *         description: Token is required
 *       401:
 *         description: Invalid token
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const { uid, email } = decodedToken;

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        email,
        firebase_uid: uid,
        role: 'user',
        vpn_enabled: false,
        created_at: new Date().toISOString(),
      });
    }

    const userData = (await userRef.get()).data();
    res.json({
      user: { uid, email, role: userData.role, vpn_enabled: userData.vpn_enabled },
      token: decodedToken,
    });
  } catch (error) {
    console.error('Auth verify error:', error.message);
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
});

// Get current user info
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid token
 *       404:
 *         description: User not found
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const { uid } = decodedToken;

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    res.json({
      uid,
      email: userData.email,
      role: userData.role,
      vpn_enabled: userData.vpn_enabled,
      created_at: userData.created_at,
    });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
});

export default router;
