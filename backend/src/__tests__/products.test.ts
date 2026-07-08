import request from 'supertest';
import express from 'express';
import { initDb, closeDb, query } from '../config/db';
import { authenticateToken } from '../middleware/auth';
import { requestLogger, errorHandler } from '../middleware/logger';
import jwt from 'jsonwebtoken';

// ── Mock Dependencies ────────────────────────────────────────────────────────
jest.mock('../config/redis', () => ({
  getRedisClient: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
  }),
  checkRateLimit: () => Promise.resolve({ allowed: true, remaining: 10, reset: 10 })
}));

const ACCESS_TOKEN_SECRET = 'test_access_secret_64_characters_long_for_security_checks_validation';
process.env.ACCESS_TOKEN_SECRET = ACCESS_TOKEN_SECRET;

const app = express();
app.use(express.json());

// Import app routes directly
import * as authController from '../controllers/authController';

app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const products = await query('SELECT * FROM products');
    res.json({ data: products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', authenticateToken, async (req, res) => {
  const { id, name_en, name_ar, sku, barcode, price, cost, unit, type, category } = req.body;
  if (!name_en || !name_ar || !sku || !barcode || price === undefined) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    await query(
      `INSERT INTO products (id, name_en, name_ar, sku, barcode, price, cost, unit, type, category) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || 'p_test', name_en, name_ar, sku, barcode, price, cost || 0, unit || 'piece', type || 'piece', category || 'General']
    );
    res.status(201).json({ message: 'Created', id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.use(errorHandler);

describe('Products API Integration Tests', () => {
  let token: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await initDb();

    // Generate valid test JWT
    const payload = { id: 'u_test', email: 'test@smartpos.com', role: 'admin', branch_id: 'br_riyadh_main' };
    token = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await closeDb();
  });

  beforeEach(async () => {
    await query('DELETE FROM products');
  });

  it('should successfully create a product when authenticated', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: 'p_panadol_extra',
        name_en: 'Panadol Extra',
        name_ar: 'بنادول اكسترا',
        sku: 'SKU-PAN-001',
        barcode: '628100112233',
        price: 15.50,
        cost: 10.00,
        unit: 'piece',
        type: 'piece',
        category: 'Pharmacy'
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Created');
  });

  it('should return 401 when trying to create product without token', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({
        name_en: 'No Auth Prod',
        name_ar: 'لا صلاحية',
        sku: 'SKU-NO-AUTH',
        barcode: '00000000',
        price: 5.00
      });

    expect(res.status).toBe(401);
  });

  it('should list all products for authenticated requests', async () => {
    // 1. Create product
    await query(
      `INSERT INTO products (id, name_en, name_ar, sku, barcode, price, cost, unit, type, category) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['p_1', 'Panadol', 'بنادول', 'SKU1', 'BC1', 12.00, 8.00, 'piece', 'piece', 'Pharmacy']
    );

    // 2. Get list
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name_en).toBe('Panadol');
  });
});
