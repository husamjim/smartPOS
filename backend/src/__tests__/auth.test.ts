import request from 'supertest';
import express from 'express';
import { initDb, closeDb, query } from '../config/db';
import * as authController from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { requestLogger, errorHandler } from '../middleware/logger';

// ── Mock Dependencies ────────────────────────────────────────────────────────
jest.mock('../config/redis', () => {
  return {
    getRedisClient: () => ({
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      multi: () => ({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null, [null, 1]]) // Less than rate limit
      })
    }),
    checkRateLimit: () => Promise.resolve({ allowed: true, remaining: 10, reset: 10 })
  };
});

jest.mock('../config/queue', () => {
  return {
    addSyncJob: jest.fn().mockResolvedValue({ id: 'mock_sync_job' }),
    addInvoiceJob: jest.fn().mockResolvedValue({ id: 'mock_invoice_job' })
  };
});

jest.mock('../services/s3', () => {
  return {
    uploadToS3: jest.fn().mockResolvedValue('mock_key'),
    getDownloadPresignedUrl: jest.fn().mockResolvedValue('http://mock-presigned-url')
  };
});

// Configure App Secrets for testing
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_64_characters_long_for_security_checks_validation';
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_64_characters_long_for_security_checks_validation';

import { requireRole } from '../middleware/auth';

const app = express();
app.use(express.json());
app.use(requestLogger);

app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/token', authController.token);
app.post('/api/auth/logout', authenticateToken, authController.logout);

// Authorization & Error test routes
app.get('/api/admin-only', authenticateToken, requireRole(['admin']), (req, res) => res.json({ ok: true }));
app.get('/api/error-trigger', (req, res) => { throw new Error('Test unhandled error'); });

app.use(errorHandler);

describe('Authentication API Integration Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await initDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  beforeEach(async () => {
    // Clean tables before each test
    await query('DELETE FROM users');
    await query('DELETE FROM refresh_tokens');
    await query('DELETE FROM branches');
    
    // Seed test branch to satisfy foreign key constraint
    await query("INSERT INTO branches (id, name) VALUES ('br_riyadh_main', 'Riyadh Main')");
  });

  it('should successfully register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Admin',
        email: 'admin@smartpos.com',
        password: 'SecurePassword123',
        role: 'admin',
        branch_id: 'br_riyadh_main'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId');
    expect(res.body.message).toContain('successfully');
  });

  it('should fail registration with invalid role or weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Weak User',
        email: 'weak@smartpos.com',
        password: '123',
        role: 'invalid_role',
        branch_id: 'br_riyadh_main'
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should login successfully and return access and refresh tokens', async () => {
    // 1. Register user
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Login User',
        email: 'login@smartpos.com',
        password: 'SecurePassword123',
        role: 'cashier',
        branch_id: 'br_riyadh_main'
      });

    // 2. Login
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@smartpos.com',
        password: 'SecurePassword123'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('login@smartpos.com');
  });

  it('should deny login for incorrect credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'unknown@smartpos.com',
        password: 'WrongPassword'
      });

    expect(res.status).toBe(401);
  });

  it('should successfully refresh the access token', async () => {
    // 1. Register & Login
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Refresher',
        email: 'refresh@smartpos.com',
        password: 'SecurePassword123',
        role: 'manager',
        branch_id: 'br_riyadh_main'
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'refresh@smartpos.com',
        password: 'SecurePassword123'
      });

    const refreshToken = loginRes.body.refreshToken;

    // 2. Refresh
    const res = await request(app)
      .post('/api/auth/token')
      .send({ token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('should successfully logout the user', async () => {
    // 1. Register & Login
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Logouter',
        email: 'logout@smartpos.com',
        password: 'SecurePassword123',
        role: 'cashier',
        branch_id: 'br_riyadh_main'
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'logout@smartpos.com',
        password: 'SecurePassword123'
      });

    const { accessToken, refreshToken } = loginRes.body;

    // 2. Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token: refreshToken });

    expect(logoutRes.status).toBe(204);
  });

  it('should fail registration when email already exists', async () => {
    // 1. Register first user
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Original User',
        email: 'duplicate@smartpos.com',
        password: 'SecurePassword123',
        role: 'cashier',
        branch_id: 'br_riyadh_main'
      });

    // 2. Try duplicate
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate User',
        email: 'duplicate@smartpos.com',
        password: 'AnotherPassword456',
        role: 'cashier',
        branch_id: 'br_riyadh_main'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('exists');
  });

  it('should deny login with wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Password Test',
        email: 'pwtest@smartpos.com',
        password: 'CorrectPassword123',
        role: 'cashier',
        branch_id: 'br_riyadh_main'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'pwtest@smartpos.com',
        password: 'WrongPassword'
      });

    expect(res.status).toBe(401);
  });

  it('should return 401 when verifying an invalid token in auth middleware', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer invalid_jwt_token_format_abc_123')
      .send({ token: 'mock' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });

  it('should return 401 when token is missing in auth middleware', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ token: 'mock' });

    expect(res.status).toBe(401);
  });

  it('should deny token refresh with invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/token')
      .send({ token: 'invalid_refresh_token' });

    expect(res.status).toBe(401);
  });

  it('should fail registration when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid Email User',
        email: 'bad-email-format',
        password: 'SecurePassword123',
        role: 'cashier',
        branch_id: 'br_riyadh_main'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('email');
  });

  it('should fail registration when role is invalid but password is strong', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid Role User',
        email: 'badrole@smartpos.com',
        password: 'SecurePassword123',
        role: 'superadmin_invalid',
        branch_id: 'br_riyadh_main'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('role');
  });

  it('should deny access to admin-only route for user with cashier role', async () => {
    // 1. Register & Login Cashier
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cashier User',
        email: 'cashier_auth@smartpos.com',
        password: 'SecurePassword123',
        role: 'cashier',
        branch_id: 'br_riyadh_main'
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'cashier_auth@smartpos.com',
        password: 'SecurePassword123'
      });

    const { accessToken } = loginRes.body;

    // 2. Request Admin Route
    const res = await request(app)
      .get('/api/admin-only')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('denied');
  });

  it('should allow access to admin-only route for user with admin role', async () => {
    // 1. Register & Login Admin
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin_auth@smartpos.com',
        password: 'SecurePassword123',
        role: 'admin',
        branch_id: 'br_riyadh_main'
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin_auth@smartpos.com',
        password: 'SecurePassword123'
      });

    const { accessToken } = loginRes.body;

    // 2. Request Admin Route
    const res = await request(app)
      .get('/api/admin-only')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should trigger unhandled error handler and return 500 status', async () => {
    const res = await request(app).get('/api/error-trigger');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});
