/**
 * auth.ts — Fixed: JWT secret enforcement, proper 401 status, token expiry check
 *
 * BEFORE: const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'super_access_secret';
 *   — Fallback secret was predictable and hard-coded
 * AFTER: Throws on missing secret; proper HTTP status codes
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// SECURITY FIX [CRITICAL]: Fail hard if secret is not set — never fall back to weak defaults
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
if (!ACCESS_TOKEN_SECRET) {
  throw new Error('[FATAL] ACCESS_TOKEN_SECRET environment variable is not set. Refusing to start.');
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'cashier' | 'manager' | 'kitchen' | 'owner';
    branch_id: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // SECURITY FIX: Return proper 401 status (was returning status(0) which is invalid)
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET as string, (err: any, user: any) => {
    if (err) {
      // Distinguish between expired and invalid tokens for better UX
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error: isExpired ? 'Token expired, please refresh' : 'Invalid token',
        code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      });
    }
    req.user = user;
    next();
  });
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    next();
  };
}
