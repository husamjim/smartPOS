/**
 * metrics.ts — Prometheus metrics collection middleware
 * Exposes system memory, CPU, HTTP requests, WebSockets, and database performance.
 */
import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import { dbHealthCheck } from '../config/db';
import { logger } from './logger';

// Enable default system metrics collection (CPU, Memory, Event Loop, etc.)
client.collectDefaultMetrics({ prefix: 'smartpos_' });

// ── Metrics Definitions ──────────────────────────────────────────────────────
const httpRequestsTotal = new client.Counter({
  name: 'smartpos_http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status']
});

const httpRequestDuration = new client.Histogram({
  name: 'smartpos_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5] // Buckets for response latency
});

const databaseLatency = new client.Gauge({
  name: 'smartpos_database_latency_seconds',
  help: 'Database ping latency in seconds'
});

const databaseHealth = new client.Gauge({
  name: 'smartpos_database_healthy',
  help: 'Database connection health status (1 = healthy, 0 = degraded)'
});

const activeWebSockets = new client.Gauge({
  name: 'smartpos_websocket_connections_active',
  help: 'Number of active KDS WebSocket connections'
});

// Periodic monitoring of DB health and latency
setInterval(async () => {
  try {
    const health = await dbHealthCheck();
    databaseHealth.set(health.healthy ? 1 : 0);
    databaseLatency.set(health.latencyMs / 1000);
  } catch (err: any) {
    databaseHealth.set(0);
    logger.error('Failed to update DB metrics', { error: err.message });
  }
}, 15000);

// ── HTTP Middleware ──────────────────────────────────────────────────────────
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.route.path : req.path;
    const status = String(res.statusCode);

    httpRequestsTotal.inc({ method: req.method, route, status });
    httpRequestDuration.observe({ method: req.method, route, status }, durationSeconds);
  });

  next();
}

export function setActiveWebSocketCount(count: number) {
  activeWebSockets.set(count);
}

// ── Metrics Exporter Endpoint ────────────────────────────────────────────────
export async function getMetrics(req: Request, res: Response) {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
}
