/**
 * security.ts — Production-grade security middleware
 * Covers: Rate Limiting, Input Sanitization, Security Headers, Request Size Limits
 */
import { Request, Response, NextFunction } from 'express';

// ── In-memory rate limiter (replace with Redis in multi-instance deployments) ──
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';
}

/**
 * Creates a rate limiter middleware.
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Window duration in milliseconds
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${getClientIp(req)}:${req.path}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      });
    }

    entry.count++;
    next();
  };
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

// ── Security Headers Middleware ──────────────────────────────────────────────
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'"
  );
  // Remove server fingerprint
  res.removeHeader('X-Powered-By');
  next();
}

// ── Input Sanitization ───────────────────────────────────────────────────────
function sanitizeString(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, (c) => ({ '<': '&lt;', '>': '&gt;' }[c] || c))
    .trim()
    .slice(0, 2000); // Hard cap at 2000 chars per field
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      clean[key] = sanitizeString(val);
    } else if (typeof val === 'number') {
      clean[key] = isFinite(val) ? val : 0;
    } else if (typeof val === 'boolean') {
      clean[key] = val;
    } else if (Array.isArray(val)) {
      clean[key] = val.slice(0, 1000); // Max 1000 items in any array
    } else if (val !== null && typeof val === 'object') {
      clean[key] = sanitizeObject(val as Record<string, unknown>);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body as Record<string, unknown>);
  }
  next();
}

// ── Validate Payment/Order Enums to prevent SQL injection via enums ──────────
const VALID_PAYMENT_METHODS = new Set(['cash', 'card', 'bank_transfer', 'split']);
const VALID_PAYMENT_STATUSES = new Set(['paid', 'partial', 'unpaid']);
const VALID_ORDER_STATUSES = new Set(['completed', 'suspended', 'returned']);

export function validateOrderPayload(order: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!order.id || typeof order.id !== 'string') return { valid: false, error: 'Invalid order id' };
  if (!order.invoice_number || typeof order.invoice_number !== 'string') return { valid: false, error: 'Invalid invoice_number' };
  if (!order.branch_id || typeof order.branch_id !== 'string') return { valid: false, error: 'Invalid branch_id' };
  if (!order.user_id || typeof order.user_id !== 'string') return { valid: false, error: 'Invalid user_id' };
  if (typeof order.total !== 'number' || !isFinite(order.total) || order.total < 0) return { valid: false, error: 'Invalid total' };
  if (typeof order.tax !== 'number' || !isFinite(order.tax) || order.tax < 0) return { valid: false, error: 'Invalid tax' };
  if (!VALID_PAYMENT_METHODS.has(order.payment_method as string)) return { valid: false, error: 'Invalid payment_method' };
  if (!VALID_PAYMENT_STATUSES.has(order.payment_status as string)) return { valid: false, error: 'Invalid payment_status' };
  if (!VALID_ORDER_STATUSES.has(order.status as string)) return { valid: false, error: 'Invalid status' };
  return { valid: true };
}
