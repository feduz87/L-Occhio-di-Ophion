/**
 * Authentication Service - User registration & login
 * 
 * Password hashing: Uses bcrypt (production-ready)
 * Fallback: SHA-256 if bcrypt not available (for development)
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
const FALLBACK_TO_SHA256 = process.env.FALLBACK_PASSWORD_HASHING === 'true';

/**
 * Hash password using bcrypt or SHA-256 (fallback)
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  try {
    if (!FALLBACK_TO_SHA256) {
      return await bcrypt.hash(password, BCRYPT_ROUNDS);
    }
  } catch (err) {
    console.warn('⚠️  Bcrypt not available, falling back to SHA-256 (INSECURE for production)');
  }
  
  // Fallback to SHA-256 (development only)
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, hash) {
  try {
    // Try bcrypt first
    if (hash.startsWith('$2')) {
      return await bcrypt.compare(password, hash);
    }
  } catch (err) {
    console.warn('⚠️  Bcrypt verification failed, falling back to SHA-256');
  }
  
  // Fallback to SHA-256 comparison (development only)
  const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
  return sha256Hash === hash;
}

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @returns {string} JWT token
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
 * @param {Pool} db - Database pool
 * @param {string} username - Username
 * @param {string} email - Email address
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} User object with token
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
  const passwordHash = await hashPassword(password);

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
 * @param {Pool} db - Database pool
 * @param {string} username - Username or email
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} User object with token
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
  const passwordMatch = await verifyPassword(password, user.password_hash);
  if (!passwordMatch) {
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
 * @param {Pool} db - Database pool
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object
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

