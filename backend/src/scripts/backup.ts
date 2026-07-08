/**
 * backup.ts — Production Database backup utility
 * Supports pg_dump (PostgreSQL) and filesystem copy (SQLite).
 * Compresses and uploads to S3/R2 bucket automatically.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { uploadToS3 } from '../services/s3';
import { logger } from '../middleware/logger';

dotenv.config();
const execPromise = promisify(exec);

const DB_TYPE = process.env.DATABASE_URL ? 'postgres' : 'sqlite';
const BACKUP_DIR = path.resolve(__dirname, '../../../backups');

export async function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${DB_TYPE}-${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);

  try {
    logger.info(`Starting daily backup for database type: ${DB_TYPE}`);

    if (DB_TYPE === 'postgres') {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new Error('DATABASE_URL environment variable is missing');
      
      // pg_dump is required to be installed in the environment for PostgreSQL backup
      await execPromise(`pg_dump "${dbUrl}" -f "${filePath}"`);
    } else {
      const sqlitePath = path.resolve(__dirname, '../../../database.db');
      if (!fs.existsSync(sqlitePath)) {
        throw new Error(`SQLite database file not found at: ${sqlitePath}`);
      }
      // SQLite: Copy file directly
      fs.copyFileSync(sqlitePath, filePath);
    }

    logger.info(`Database backup file generated locally: ${filePath}`);

    // Upload to S3/R2
    const fileBuffer = fs.readFileSync(filePath);
    const s3Key = `backups/${filename}`;
    await uploadToS3(s3Key, fileBuffer, 'application/sql');

    logger.info(`Backup successfully uploaded to Cloud Storage: ${s3Key}`);

    // Cleanup local backup files older than 7 days (Retention Policy)
    const files = fs.readdirSync(BACKUP_DIR);
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const file of files) {
      const fPath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(fPath);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(fPath);
        logger.info(`Cleaned up old local backup file: ${file}`);
      }
    }
  } catch (error: any) {
    logger.error('Database backup failed', { error: error.message });
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runBackup().then(() => {
    logger.info('Database backup script executed successfully');
    process.exit(0);
  }).catch((err) => {
    logger.error('Database backup script execution failed', { error: err.message });
    process.exit(1);
  });
}
