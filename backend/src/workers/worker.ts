/**
 * worker.ts — BullMQ background jobs processing worker
 * Handles:
 * 1. 'bulk-sync' - Resilient database offline queue inserts
 * 2. 'generate-invoice' - Resilient invoice creation tasks
 * Moves failed jobs after max retries to a Dead Letter Queue table.
 */
import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { query } from '../config/db';
import { validateOrderPayload } from '../middleware/security';
import { logger } from '../middleware/logger';

const connection = getRedisClient() as any;

// ── Dead Letter Queue (DLQ) Fallback Logger ──────────────────────────────────
async function moveToDeadLetterQueue(job: Job, err: Error) {
  logger.error(`[DLQ] Job ${job.id} failed after all retries. Moving to DLQ.`, {
    jobName: job.name,
    queueName: job.queueName,
    error: err.message,
    payload: job.data
  });

  try {
    const dlqId = 'dlq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await query(
      `INSERT INTO transactions (id, account_id, debit, credit, description, date) 
       VALUES (?, ?, 0, 0, ?, ?)`,
      [
        dlqId,
        'dlq_monitoring_placeholder',
        `DLQ Error: Queue=${job.queueName} JobId=${job.id} Reason=${err.message.slice(0, 100)}`,
        new Date().toISOString()
      ]
    );
  } catch (dbErr: any) {
    logger.error('Failed to log DLQ job status in DB', { error: dbErr.message });
  }
}

// ── Worker: Sync Queue ───────────────────────────────────────────────────────
const syncWorker = new Worker('sync-queue', async (job: Job) => {
  logger.info(`Processing Sync job ${job.id}...`);
  const { queue } = job.data;

  if (!Array.isArray(queue)) {
    throw new Error('Invalid payload: Queue array expected');
  }

  let processed = 0;
  for (const item of queue) {
    if (item.table === 'orders' && item.action === 'CREATE') {
      const order = item.payload;

      const validation = validateOrderPayload(order);
      if (!validation.valid) {
        logger.warn(`Order payload validation failed for order ${order?.id}`, { error: validation.error });
        continue;
      }

      const existing = await query('SELECT id FROM orders WHERE id = ?', [order.id]);
      if (existing.length === 0) {
        await query(
          `INSERT INTO orders (id, invoice_number, branch_id, customer_id, user_id, total, tax, discount, payment_status, payment_method, split_details, status, is_synced, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            order.id, order.invoice_number, order.branch_id, order.customer_id || null,
            order.user_id, order.total, order.tax, order.discount || 0,
            order.payment_status, order.payment_method, order.split_details || null,
            order.status, order.created_at
          ]
        );
        processed++;
      }
    }
  }

  logger.info(`Sync job ${job.id} completed. Processed ${processed} orders.`);
  return { processed };
}, { connection, concurrency: 5 });

syncWorker.on('failed', async (job: Job | undefined, err: Error) => {
  if (job) {
    logger.warn(`Sync job ${job.id} failed: ${err.message}. Retries remaining: ${job.opts.attempts! - job.attemptsMade}`);
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      await moveToDeadLetterQueue(job, err);
    }
  }
});

// ── Worker: Invoice Queue ────────────────────────────────────────────────────
const invoiceWorker = new Worker('invoice-queue', async (job: Job) => {
  logger.info(`Processing Invoice job ${job.id}...`);
  const { orderId } = job.data;

  const orders = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (orders.length === 0) {
    throw new Error(`Order ${orderId} not found in DB`);
  }

  // Simulate generating digital signature for local tax authority (ZATCA compliance simulation)
  const hash = require('crypto').createHash('sha256').update(JSON.stringify(orders[0])).digest('hex');
  logger.info(`Generated tax authority digital signature for invoice ${orderId}`, { signature: hash });

  return { invoiceSignature: hash };
}, { connection, concurrency: 10 });

invoiceWorker.on('failed', async (job: Job | undefined, err: Error) => {
  if (job) {
    logger.warn(`Invoice job ${job.id} failed: ${err.message}. Retries remaining: ${job.opts.attempts! - job.attemptsMade}`);
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      await moveToDeadLetterQueue(job, err);
    }
  }
});

export function startWorkers() {
  logger.info('BullMQ workers started successfully');
}
