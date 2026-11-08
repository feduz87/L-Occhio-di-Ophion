/**
 * Authentication Service - User registration & login
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hash password using SHA-256
 * (In production, use bcrypt!)
 */
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Generate JWT token
 */
export function generateToken(userId, username) {
  const token = jwt.sign(
    {
      user_id: userId,
      username,
    },
    process.env.JWT_SECRET || 'dev_secret_key',
    {
      expiresIn: '24h',
    }
  );

  return token;
}

/**
 * Register new user
 */
export async function registerUser(db, username, email, password) {
  // Validate input
  if (!username || username.length < 3 || username.length > 255) {
    throw new Error('Username must be 3-255 characters');
  }

  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
  }

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Check if user exists
  const existingUser = await db.query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [username.toLowerCase(), email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    throw new Error('Username or email already exists');
  }

  // Hash password
  const passwordHash = hashPassword(password);

  // Create user
  const userId = uuidv4();
  await db.query(
    'INSERT INTO users (id, username, email, password_hash, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
    [userId, username.toLowerCase(), email.toLowerCase(), passwordHash]
  );

  // Generate token
  const token = generateToken(userId, username);

  return {
    user_id: userId,
    username,
    email,
    token,
    expires_in: 86400, // 24 hours
  };
}

/**
 * Login user
 */
export async function loginUser(db, username, password) {
  if (!username || !password) {
    throw new Error('Username and password required');
  }

  // Find user
  const result = await db.query(
    'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1',
    [username.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid username or password');
  }

  const user = result.rows[0];

  // Verify password
  const passwordHash = hashPassword(password);
  if (user.password_hash !== passwordHash) {
    throw new Error('Invalid username or password');
  }

  // Update last login
  await db.query(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  // Generate token
  const token = generateToken(user.id, user.username);

  return {
    user_id: user.id,
    username: user.username,
    email: user.email,
    token,
    expires_in: 86400,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(db, userId) {
  const result = await db.query(
    'SELECT id, username, email, created_at, last_login FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
}
