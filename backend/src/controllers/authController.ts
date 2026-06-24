import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'super_access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'super_refresh_secret';

// Store refresh tokens temporarily (in-memory fallback cache)
let refreshTokens: string[] = [];

export async function login(req: AuthenticatedRequest, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id
    };

    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET);

    refreshTokens.push(refreshToken);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function register(req: AuthenticatedRequest, res: Response) {
  const { name, email, password, role, branch_id } = req.body;
  if (!name || !email || !password || !role || !branch_id) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const existingUsers = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = 'u_' + Math.random().toString(36).substr(2, 9);

    await query(
      'INSERT INTO users (id, name, email, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, email, passwordHash, role, branch_id]
    );

    res.status(201).json({
      message: 'User registered successfully',
      userId
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export function token(req: AuthenticatedRequest, res: Response) {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  if (!refreshTokens.includes(token)) {
    return res.status(403).json({ error: 'Refresh token invalid' });
  }

  jwt.verify(token, REFRESH_TOKEN_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Refresh token invalid' });
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, branch_id: user.branch_id },
      ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );
    res.json({ accessToken });
  });
}

export function logout(req: AuthenticatedRequest, res: Response) {
  const { token } = req.body;
  refreshTokens = refreshTokens.filter(t => t !== token);
  res.sendStatus(204);
}
