/**
 * logger.ts — Structured JSON logging middleware for production
 * Covers: Request logging, Error tracking, Performance monitoring
 */
import { Request, Response, NextFunction } from 'express';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  userId?: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  // In production, this should pipe to a log aggregator (e.g., CloudWatch, Datadog, Loki)
  console.log(JSON.stringify(entry));
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('DEBUG', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('INFO', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('WARN', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('ERROR', msg, meta),
};

// ── HTTP Request Logger Middleware ───────────────────────────────────────────
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress;

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const level: LogLevel = res.statusCode >= 500 ? 'ERROR'
      : res.statusCode >= 400 ? 'WARN'
      : 'INFO';

    logger[level.toLowerCase() as 'info' | 'warn' | 'error']('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      ip,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}

// ── Error Handler Middleware ─────────────────────────────────────────────────
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    method: req.method,
    path: req.path,
  });

  // Don't leak internal error details to clients in production
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    error: 'Internal server error',
    ...(isDev ? { details: err.message } : {}),
  });
}
