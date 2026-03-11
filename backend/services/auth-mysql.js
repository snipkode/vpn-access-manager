/**
 * Authentication Service - MySQL Implementation
 * JWT-based authentication with password hashing
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate password hash
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Register new user
 */
export async function register(userData) {
  try {
    // Check if user exists
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create user
    const user = await User.create({
      id: `user-${Date.now()}`,
      email: userData.email,
      name: userData.name || null,
      password: hashedPassword,
      role: userData.role || 'user',
      vpn_enabled: false,
      subscription_status: 'trialing',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Generate token
    const token = generateToken(user.toJSON());

    return {
      user: user.toJSON(),
      token,
      message: 'User registered successfully'
    };
  } catch (error) {
    console.error('Register error:', error.message);
    throw error;
  }
}

/**
 * Login user
 */
export async function login(email, password) {
  try {
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken(user.toJSON());

    return {
      user: user.toJSON(),
      token,
      message: 'Login successful'
    };
  } catch (error) {
    console.error('Login error:', error.message);
    throw error;
  }
}

/**
 * Get user by ID (without sensitive data)
 */
export async function getUserById(userId) {
  const user = await User.findByPk(userId, {
    attributes: {
      exclude: ['password']
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user.toJSON();
}

/**
 * Update user password
 */
export async function updatePassword(userId, oldPassword, newPassword) {
  const user = await User.findByPk(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  // Verify old password
  const isValid = await verifyPassword(oldPassword, user.password);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await user.update({
    password: hashedPassword,
    updated_at: new Date()
  });

  return { message: 'Password updated successfully' };
}

/**
 * Middleware to verify JWT token
 */
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Token expired or invalid' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Middleware to verify admin role
 */
export function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
