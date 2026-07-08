import request from 'supertest';
import express from 'express';
import { initDb, closeDb, dbHealthCheck } from '../config/db';

const app = express();
app.get('/health', async (req, res) => {
  const health = await dbHealthCheck();
  res.status(health.healthy ? 200 : 503).json(health);
});

describe('Database Health Check API', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await initDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should return 200 and latency details when database is healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('healthy', true);
    expect(res.body).toHaveProperty('latencyMs');
  });
});
