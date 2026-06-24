import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

let dbType: 'sqlite' | 'postgres' = process.env.DATABASE_URL ? 'postgres' : 'sqlite';
let pgPool: Pool | null = null;
let sqliteDb: Database | null = null;

export async function initDb() {
  if (dbType === 'postgres') {
    console.log('Connecting to PostgreSQL database...');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    // Verify connection
    await pgPool.query('SELECT NOW()');
    console.log('PostgreSQL connected successfully.');
    await seedPostgresSchema();
  } else {
    console.log('Connecting to SQLite local database...');
    const dbPath = path.resolve(__dirname, '../../database.db');
    sqliteDb = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log(`SQLite database opened at: ${dbPath}`);
    await createSqliteSchema();
  }
}

export async function query(sql: string, params: any[] = []): Promise<any> {
  if (dbType === 'postgres' && pgPool) {
    const res = await pgPool.query(sql, params);
    return res.rows;
  } else if (sqliteDb) {
    // Standardize query method names for SELECT or modifying commands
    const isMutating = /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(sql);
    if (isMutating) {
      const result = await sqliteDb.run(sql, params);
      return { insertId: result.lastID, changes: result.changes };
    } else {
      return await sqliteDb.all(sql, params);
    }
  }
  throw new Error('Database not initialized');
}

async function createSqliteSchema() {
  if (!sqliteDb) return;

  // Create tables in SQLite
  await sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      phone TEXT
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      capacity REAL,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      branch_id TEXT,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      scientific_name TEXT,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL,
      unit TEXT NOT NULL,
      type TEXT NOT NULL, -- 'piece' or 'weight'
      category TEXT NOT NULL,
      min_stock REAL DEFAULT 5,
      is_pharmaceutical INTEGER DEFAULT 0,
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      batch_number TEXT NOT NULL,
      expiry_date TEXT,
      quantity REAL NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      from_warehouse_id TEXT,
      to_warehouse_id TEXT,
      quantity REAL NOT NULL,
      type TEXT NOT NULL, -- 'purchase', 'sale', 'transfer', 'adjust'
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      points INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'silver', -- 'silver', 'gold', 'platinum'
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      branch_id TEXT NOT NULL,
      customer_id TEXT,
      user_id TEXT NOT NULL,
      total REAL NOT NULL,
      tax REAL NOT NULL,
      discount REAL NOT NULL,
      payment_status TEXT NOT NULL, -- 'paid', 'partial', 'unpaid'
      payment_method TEXT NOT NULL, -- 'cash', 'card', 'bank_transfer', 'split'
      split_details TEXT, -- JSON string representation
      status TEXT NOT NULL, -- 'completed', 'suspended', 'returned'
      is_synced INTEGER DEFAULT 1,
      offline_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      batch_id TEXT,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      discount REAL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL, -- 'pending', 'received'
      created_at TEXT NOT NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
      balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      description TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
  `);
  
  // Seed default metadata if empty
  const branchesCount = await sqliteDb.all('SELECT COUNT(*) as cnt FROM branches');
  if (branchesCount[0].cnt === 0) {
    console.log('Seeding SQLite backend records...');
    await sqliteDb.run("INSERT INTO branches (id, name, location, phone) VALUES ('br_riyadh_main', 'فرع الرياض الرئيسي', 'الرياض - العليا', '0112003000')");
    await sqliteDb.run("INSERT INTO branches (id, name, location, phone) VALUES ('br_jeddah_mall', 'فرع جدة مول', 'جدة - شارع التحلية', '0123004000')");
    
    await sqliteDb.run("INSERT INTO warehouses (id, name, branch_id, capacity) VALUES ('wh_riyadh_1', 'مستودع الرياض الأول', 'br_riyadh_main', 5000)");
    await sqliteDb.run("INSERT INTO warehouses (id, name, branch_id, capacity) VALUES ('wh_riyadh_2', 'مستودع صيدلية الرياض', 'br_riyadh_main', 2000)");
    await sqliteDb.run("INSERT INTO warehouses (id, name, branch_id, capacity) VALUES ('wh_jeddah_1', 'مستودع جدة (أ)', 'br_jeddah_mall', 3000)");

    // Seed Admin (password: admin123)
    const adminHash = require('bcryptjs').hashSync('admin123', 10);
    await sqliteDb.run(
      "INSERT INTO users (id, name, email, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?, ?)",
      ['u_default_admin', 'Admin Manager', 'admin@antigravity.com', adminHash, 'admin', 'br_riyadh_main']
    );
    console.log('Default SQLite backend seed complete.');
  }

  console.log('SQLite tables verified.');
}

async function seedPostgresSchema() {
  if (!pgPool) return;
  // Standard schema deployment for Postgres - creating matching tables.
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      phone TEXT
    );
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      branch_id TEXT REFERENCES branches(id),
      capacity REAL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      branch_id TEXT REFERENCES branches(id)
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      scientific_name TEXT,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL,
      unit TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      min_stock REAL DEFAULT 5,
      is_pharmaceutical INTEGER DEFAULT 0,
      image TEXT
    );
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id),
      warehouse_id TEXT REFERENCES warehouses(id),
      batch_number TEXT NOT NULL,
      expiry_date TEXT,
      quantity REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id),
      from_warehouse_id TEXT,
      to_warehouse_id TEXT,
      quantity REAL NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      points INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'silver',
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      branch_id TEXT REFERENCES branches(id),
      customer_id TEXT REFERENCES customers(id),
      user_id TEXT REFERENCES users(id),
      total REAL NOT NULL,
      tax REAL NOT NULL,
      discount REAL NOT NULL,
      payment_status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      split_details TEXT,
      status TEXT NOT NULL,
      is_synced INTEGER DEFAULT 1,
      offline_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id),
      product_id TEXT REFERENCES products(id),
      batch_id TEXT REFERENCES batches(id),
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      discount REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      balance REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      supplier_id TEXT REFERENCES suppliers(id),
      warehouse_id TEXT REFERENCES warehouses(id),
      total REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      branch_id TEXT REFERENCES branches(id),
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(id),
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      description TEXT,
      date TEXT NOT NULL
    );
  `);
  
  // Seed default metadata if empty in Postgres
  const branchesCount = await pgPool.query('SELECT COUNT(*) as cnt FROM branches');
  if (parseInt(branchesCount.rows[0].cnt) === 0) {
    console.log('Seeding PostgreSQL backend records...');
    await pgPool.query("INSERT INTO branches (id, name, location, phone) VALUES ('br_riyadh_main', 'فرع الرياض الرئيسي', 'الرياض - العليا', '0112003000')");
    await pgPool.query("INSERT INTO branches (id, name, location, phone) VALUES ('br_jeddah_mall', 'فرع جدة مول', 'جدة - شارع التحلية', '0123004000')");
    
    await pgPool.query("INSERT INTO warehouses (id, name, branch_id, capacity) VALUES ('wh_riyadh_1', 'مستودع الرياض الأول', 'br_riyadh_main', 5000)");
    await pgPool.query("INSERT INTO warehouses (id, name, branch_id, capacity) VALUES ('wh_riyadh_2', 'مستودع صيدلية الرياض', 'br_riyadh_main', 2000)");
    await pgPool.query("INSERT INTO warehouses (id, name, branch_id, capacity) VALUES ('wh_jeddah_1', 'مستودع جدة (أ)', 'br_jeddah_mall', 3000)");

    // Seed Admin (password: admin123)
    const adminHash = require('bcryptjs').hashSync('admin123', 10);
    await pgPool.query(
      "INSERT INTO users (id, name, email, password_hash, role, branch_id) VALUES ($1, $2, $3, $4, $5, $6)",
      ['u_default_admin', 'Admin Manager', 'admin@antigravity.com', adminHash, 'admin', 'br_riyadh_main']
    );
    console.log('Default PostgreSQL backend seed complete.');
  }

  console.log('PostgreSQL schema verified.');
}

