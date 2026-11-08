/**
 * Authentication API Routes
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as authService from '../services/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'username, email, and password are required',
      });
    }

    const user = await authService.registerUser(req.db, username, email, password);

    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Conflict',
        message: error.message,
      });
    }

    if (error.message.includes('must be')) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message,
      });
    }

    req.logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Registration failed',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'username and password are required',
      });
    }

    const user = await authService.loginUser(req.db, username, password);

    res.json({
      message: 'Login successful',
      user,
    });
  } catch (error) {
    if (error.message.includes('Invalid')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password',
      });
    }

    req.logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const user = await authService.getUserById(req.db, userId);

    res.json(user);
  } catch (error) {
    req.logger.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token deletion)
 */
router.post('/logout', authMiddleware, (req, res) => {
  // JWT is stateless, so logout just returns success
  // Client deletes token from localStorage
  res.json({
    message: 'Logout successful',
  });
});

export default router;
