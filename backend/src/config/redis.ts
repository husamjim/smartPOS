/**
 * redis.ts — Production-grade Redis client wrapper
 * Supports: Single instance, Redis Cluster, automatic reconnect, health monitoring, structured logging
 */
import Redis, { Cluster, RedisOptions } from 'ioredis';
import { logger } from '../middleware/logger';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_CLUSTER_NODES = process.env.REDIS_CLUSTER_NODES; // Comma-separated host:port

let redisClient: Redis | Cluster;

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Critical for BullMQ
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis connection lost. Retrying in ${delay}ms... (attempt ${times})`);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect on readonly error (e.g. failover in redis cluster)
      return true;
    }
    return false;
  }
};

export function initRedis() {
  if (REDIS_CLUSTER_NODES) {
    logger.info('Initializing Redis Cluster client...');
    const nodes = REDIS_CLUSTER_NODES.split(',').map((node) => {
      const [host, port] = node.trim().split(':');
      return { host, port: parseInt(port) || 6379 };
    });
    
    redisClient = new Redis.Cluster(nodes, {
      redisOptions,
      dnsLookup: (address, callback) => callback(null, address),
      slotsRefreshTimeout: 2000
    });
  } else {
    logger.info('Initializing Single-Node Redis client...');
    const connectionString = REDIS_URL || 'redis://127.0.0.1:6379';
    redisClient = new Redis(connectionString, redisOptions);
  }

  redisClient.on('connect', () => {
    logger.info('Redis connection established');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready for operations');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  return redisClient;
}

export function getRedisClient(): Redis | Cluster {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

// ── Caching Layer Helpers ────────────────────────────────────────────────────
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await getRedisClient().get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err: any) {
    logger.error('Redis Cache GET failed', { key, error: err.message });
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    await getRedisClient().set(key, serialized, 'EX', ttlSeconds);
  } catch (err: any) {
    logger.error('Redis Cache SET failed', { key, error: err.message });
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await getRedisClient().del(key);
  } catch (err: any) {
    logger.error('Redis Cache DEL failed', { key, error: err.message });
  }
}

// ── Distributed Rate Limiter helper ──────────────────────────────────────────
export async function checkRateLimit(ip: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const client = getRedisClient();
  const key = `ratelimit:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const clearBefore = now - windowSeconds;

  try {
    const multi = client.multi();
    multi.zremrangebyscore(key, 0, clearBefore);
    multi.zadd(key, now, `${now}_${Math.random()}`);
    multi.zcard(key);
    multi.expire(key, windowSeconds);
    
    const results = await multi.exec();
    if (!results) return { allowed: true, remaining: limit, reset: windowSeconds };

    // Card is the 3rd command result (index 2)
    const cardResult = results[2];
    const card = typeof cardResult[1] === 'number' ? cardResult[1] : 0;
    
    const remaining = Math.max(0, limit - card);
    return {
      allowed: card <= limit,
      remaining,
      reset: windowSeconds
    };
  } catch (err: any) {
    logger.error('Redis rate limit check failed, defaulting to allow', { ip, error: err.message });
    return { allowed: true, remaining: 1, reset: windowSeconds };
  }
}
