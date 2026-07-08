/**
 * queue.ts — BullMQ production-grade queues configuration
 * Connects with ioredis connection pool and configures exponential backoff retries.
 */
import { Queue, QueueOptions } from 'bullmq';
import { getRedisClient } from './redis';
import { logger } from '../middleware/logger';

// Re-use connection client
const connection = getRedisClient() as any; // Cast to bypass types checking as BullMQ accepts ioredis instances

const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 5000 // Start with 5s delay, then 10s, then 20s
    },
    removeOnComplete: {
      age: 3600 * 24, // Keep logs for 24h
      count: 1000 // Keep last 1000 jobs
    },
    removeOnFail: {
      age: 3600 * 24 * 7, // Keep failed logs for 7 days (acting as dead letter storage metadata)
      count: 5000
    }
  }
};

// ── Sync Queue ───────────────────────────────────────────────────────────────
export const syncQueue = new Queue('sync-queue', defaultQueueOptions);

// ── Invoice Queue ────────────────────────────────────────────────────────────
export const invoiceQueue = new Queue('invoice-queue', defaultQueueOptions);

export async function addSyncJob(payload: any) {
  try {
    const job = await syncQueue.add('bulk-sync', payload, {
      jobId: `sync_${payload.userId || 'default'}_${Date.now()}`
    });
    logger.info('Sync job added to queue', { jobId: job.id });
    return job;
  } catch (error: any) {
    logger.error('Failed to add sync job to queue', { error: error.message });
    throw error;
  }
}

export async function addInvoiceJob(orderId: string, orderData: any) {
  try {
    const job = await invoiceQueue.add('generate-invoice', { orderId, orderData }, {
      jobId: `invoice_${orderId}`
    });
    logger.info('Invoice job added to queue', { jobId: job.id });
    return job;
  } catch (error: any) {
    logger.error('Failed to add invoice job to queue', { error: error.message });
    throw error;
  }
}
