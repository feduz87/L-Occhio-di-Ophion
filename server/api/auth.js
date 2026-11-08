/**
 * Authentication API Routes
 * 
 * Uses centralized error handling via AppError + errorHandler middleware
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler, AppError, ERROR_CODES } from '../middleware/errorHandler.js';
import * as authService from '../services/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', asyncHandler(async (req, res, next) => {
  const { username, email, password } = req.body;

  // Validation
  if (!username || !email || !password) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      'username, email, and password are required',
      400,
      { required: ['username', 'email', 'password'] }
    );
  }

  // Attempt registration
  try {
    const user = await authService.registerUser(req.db, username, email, password);
    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    // Handle service-level errors
    if (error.message.includes('already exists')) {
      throw new AppError(ERROR_CODES.CONFLICT, error.message, 409);
    }
    if (error.message.includes('must be')) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, error.message, 400);
    }
    throw error;
  }
}));

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
router.post('/login', asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      'username and password are required',
      400,
      { required: ['username', 'password'] }
    );
  }

  // Attempt login
  try {
    const user = await authService.loginUser(req.db, username, password);
    res.json({
      message: 'Login successful',
      token: user.token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
      },
      expires_in: user.expires_in,
    });
  } catch (error) {
    if (error.message.includes('Invalid') || error.message.includes('required')) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Invalid username or password',
        401
      );
    }
    throw error;
  }
}));

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res, next) => {
  const userId = req.user.user_id;
  const user = await authService.getUserById(req.db, userId);
  
  res.json({
    user: {
      user_id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
      last_login: user.last_login,
    },
  });
}));

/**
 * POST /api/auth/logout
 * Logout user (client-side token deletion)
 * 
 * JWT is stateless, so logout is handled client-side
 * This endpoint just confirms the logout action
 */
router.post('/logout', authMiddleware, (req, res) => {
  res.json({
    message: 'Logout successful',
    user_id: req.user.user_id,
  });
});

export default router;

