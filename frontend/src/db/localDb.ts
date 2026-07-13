/**
 * localDb.ts — Fixed and optimized IndexedDB schema
 *
 * FIXES APPLIED:
 * 1. [HIGH] Added composite indexes for common query patterns
 * 2. [HIGH] Removed duplicate v3 schema (identical to v2)
 * 3. [HIGH] Added typed interfaces for suppliers/purchaseOrders/expenses
 * 4. [MEDIUM] Replaced image_base64 with blob-friendly approach
 * 5. [MEDIUM] Added app_settings table for persistent config
 * 6. [MEDIUM] Added invoice_counter for atomic sequential invoice numbers
 */
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { telemetry } from '../utils/telemetry';
telemetry.dbStart = Date.now();

export interface LocalProduct {
  id: string;
  name_en: string;
  name_ar: string;
  scientific_name?: string;
  sku: string;
  barcode: string;
  price: number;
  cost: number;
  unit: string;
  type: 'piece' | 'weight';
  category: string;
  min_stock: number;
  is_pharmaceutical: number; // 0 | 1
  image?: string;            // URL or small base64 thumbnail
  image_base64?: string;     // DEPRECATED: kept for migration compatibility
  stock?: number;
  approval_id?: string;
  recipe?: string;           // stringified Recipe JSON
  variants?: string;         // stringified Variant JSON
  shipment_details?: string; // stringified Shipment JSON
  created_at?: string;
  updated_at?: string;
}

export interface LocalBatch {
  id: string;
  product_id: string;
  warehouse_id: string;
  batch_number: string;
  expiry_date?: string;
  quantity: number;
}

export interface LocalCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  tier: 'silver' | 'gold' | 'platinum';
  notes?: string;
  created_at?: string;
}

export interface LocalOrder {
  id: string;
  invoice_number: string;
  branch_id: string;
  customer_id?: string;
  user_id: string;
  total: number;
  tax: number;
  discount: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'split';
  split_details?: string;
  status: 'completed' | 'suspended' | 'returned';
  is_synced: number; // 0 | 1
  created_at: string;
  refund_of_order_id?: string;
  refund_note?: string;
  table_number?: string;
}

export interface LocalOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  batch_id?: string;
  quantity: number;
  price: number;
  discount: number;
}

export interface LocalRefund {
  id: string;
  original_order_id: string;
  refund_order_id: string;
  items: string; // JSON stringified array
  total: number;
  reason: string;
  created_at: string;
  user_id: string;
}

export interface LocalSuspendedOrder {
  id: string;
  invoice_number: string;
  items: Array<{
    product: LocalProduct;
    quantity: number;
    selectedBatch?: LocalBatch;
    discountPercentage?: number;
  }>;
  customer?: LocalCustomer;
  total: number;
  date: string;
  branch_id: string;
  table_number?: string;
}

export interface OfflineQueueItem {
  id?: number; // auto-increment
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  table: 'orders' | 'customers' | 'order_items' | 'batches';
  payload: unknown;
  timestamp: string;
  retryCount?: number;
}

// PERFORMANCE FIX: Typed interfaces instead of Table<any>
export interface LocalSupplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  balance: number;
}

export interface LocalPurchaseOrder {
  id: string;
  supplier_id: string;
  warehouse_id: string;
  items?: string; // JSON
  total: number;
  status: 'pending' | 'received' | 'cancelled';
  created_at: string;
}

export interface LocalExpense {
  id: string;
  branch_id: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
}

export interface AppSetting {
  key: string;
  value: string;
}

export interface LocalAuditLog {
  id?: number;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  branch: string;
  result: 'success' | 'failure' | 'warning';
  device?: string;
  sessionId?: string;
}

export interface LocalNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: number; // 0 | 1
  createdAt: string;
}

export class CashierDexieDb extends Dexie {
  products!: Table<LocalProduct>;
  batches!: Table<LocalBatch>;
  customers!: Table<LocalCustomer>;
  orders!: Table<LocalOrder>;
  orderItems!: Table<LocalOrderItem>;
  suspendedOrders!: Table<LocalSuspendedOrder>;
  offlineQueue!: Table<OfflineQueueItem>;
  suppliers!: Table<LocalSupplier>;
  purchaseOrders!: Table<LocalPurchaseOrder>;
  expenses!: Table<LocalExpense>;
  refunds!: Table<LocalRefund>;
  appSettings!: Table<AppSetting>;
  auditLog!: Table<LocalAuditLog>;
  notifications!: Table<LocalNotification>;
  users!: Table<any>; // Isolated users table for each company

  constructor(dbName = 'CashierSystemDb') {
    super(dbName);

    // Version 1 — Original schema
    this.version(1).stores({
      products: 'id, name_en, name_ar, sku, barcode, category',
      batches: 'id, product_id, warehouse_id, batch_number, expiry_date',
      customers: 'id, name, phone, email, tier',
      orders: 'id, invoice_number, branch_id, customer_id, payment_status, is_synced, created_at',
      orderItems: 'id, order_id, product_id, batch_id',
      suspendedOrders: 'id, invoice_number, date, branch_id',
      offlineQueue: '++id, action, table, timestamp',
      suppliers: 'id, name, phone',
      purchaseOrders: 'id, supplier_id, status',
      expenses: 'id, branch_id, category',
    });

    // Version 2 — Added refunds table and refund_of_order_id index
    this.version(2).stores({
      products: 'id, name_en, name_ar, sku, barcode, category',
      batches: 'id, product_id, warehouse_id, batch_number, expiry_date',
      customers: 'id, name, phone, email, tier',
      orders: 'id, invoice_number, branch_id, customer_id, payment_status, is_synced, created_at, refund_of_order_id',
      orderItems: 'id, order_id, product_id, batch_id',
      suspendedOrders: 'id, invoice_number, date, branch_id',
      offlineQueue: '++id, action, table, timestamp',
      suppliers: 'id, name, phone',
      purchaseOrders: 'id, supplier_id, status',
      expenses: 'id, branch_id, category',
      refunds: 'id, original_order_id, refund_order_id, created_at',
    });

    // Version 4 — Composite indexes
    this.version(4).stores({
      products: 'id, name_en, name_ar, sku, barcode, category, is_pharmaceutical',
      batches: 'id, product_id, warehouse_id, batch_number, expiry_date',
      customers: 'id, name, phone, email, tier',
      orders: 'id, invoice_number, [branch_id+created_at], branch_id, customer_id, payment_status, is_synced, created_at, refund_of_order_id, status',
      orderItems: 'id, order_id, product_id, batch_id',
      suspendedOrders: 'id, invoice_number, date, branch_id',
      offlineQueue: '++id, action, table, timestamp, retryCount',
      suppliers: 'id, name, phone',
      purchaseOrders: 'id, supplier_id, status, created_at',
      expenses: 'id, [branch_id+date], branch_id, category',
      refunds: 'id, original_order_id, refund_order_id, created_at',
      appSettings: 'key',
    });

    // Version 5 — Added auditLog and notifications tables for Commercial Release
    this.version(5).stores({
      products: 'id, name_en, name_ar, sku, barcode, category, is_pharmaceutical',
      batches: 'id, product_id, warehouse_id, batch_number, expiry_date',
      customers: 'id, name, phone, email, tier',
      orders: 'id, invoice_number, [branch_id+created_at], branch_id, customer_id, payment_status, is_synced, created_at, refund_of_order_id, status',
      orderItems: 'id, order_id, product_id, batch_id',
      suspendedOrders: 'id, invoice_number, date, branch_id',
      offlineQueue: '++id, action, table, timestamp, retryCount',
      suppliers: 'id, name, phone',
      purchaseOrders: 'id, supplier_id, status, created_at',
      expenses: 'id, [branch_id+date], branch_id, category',
      refunds: 'id, original_order_id, refund_order_id, created_at',
      appSettings: 'key',
      auditLog: '++id, timestamp, user, action, entity, branch',
      notifications: 'id, type, isRead, createdAt'
    });

    // Version 6 — Added isolated users table
    this.version(6).stores({
      products: 'id, name_en, name_ar, sku, barcode, category, is_pharmaceutical',
      batches: 'id, product_id, warehouse_id, batch_number, expiry_date',
      customers: 'id, name, phone, email, tier',
      orders: 'id, invoice_number, [branch_id+created_at], branch_id, customer_id, payment_status, is_synced, created_at, refund_of_order_id, status',
      orderItems: 'id, order_id, product_id, batch_id',
      suspendedOrders: 'id, invoice_number, date, branch_id',
      offlineQueue: '++id, action, table, timestamp, retryCount',
      suppliers: 'id, name, phone',
      purchaseOrders: 'id, supplier_id, status, created_at',
      expenses: 'id, [branch_id+date], branch_id, category',
      refunds: 'id, original_order_id, refund_order_id, created_at',
      appSettings: 'key',
      auditLog: '++id, timestamp, user, action, entity, branch',
      notifications: 'id, type, isRead, createdAt',
      users: 'id, username, role, active'
    });
  }
}

// Global active database instance tracker
let currentDb = new CashierDexieDb('CashierSystemDb');

export const db = new Proxy({}, {
  get(_, prop) {
    const activeCompanyId = localStorage.getItem('active_company_id');
    const expectedDbName = activeCompanyId ? `CashierSystemDb_${activeCompanyId}` : 'CashierSystemDb';
    if (currentDb.name !== expectedDbName) {
      currentDb.close();
      currentDb = new CashierDexieDb(expectedDbName);
    }
    const value = Reflect.get(currentDb, prop);
    if (typeof value === 'function') {
      return value.bind(currentDb);
    }
    return value;
  }
}) as CashierDexieDb;

export function getCompanyDbInstance(companyId: string): CashierDexieDb {
  return new CashierDexieDb(`CashierSystemDb_${companyId}`);
}

// ── Atomic Invoice Counter ────────────────────────────────────────────────────
/**
 * PERFORMANCE FIX: Use a persistent atomic counter for invoice numbers
 * instead of Date.now() + Math.random() which can collide.
 */
export async function getNextInvoiceNumber(prefix = 'INV'): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const counterKey = `invoice_counter_${today}`;

  return db.transaction('rw', db.appSettings, async () => {
    const setting = await db.appSettings.get(counterKey);
    const nextNum = setting ? parseInt(setting.value) + 1 : 1;
    await db.appSettings.put({ key: counterKey, value: String(nextNum) });
    return `${prefix}-${today}-${String(nextNum).padStart(4, '0')}`;
  });
}

// ── Seed/Migration function ───────────────────────────────────────────────────
export async function seedLocalDbIfEmpty() {
  if (!telemetry.dbStart || telemetry.dbStart === telemetry.bootStart) {
    telemetry.dbStart = Date.now();
  }
  // PERFORMANCE FIX: Only run once on mount, not on every theme change
  // Migrate any legacy 'Restaurant' category products to detailed subcategories
  const restaurantProducts = await db.products.where('category').equals('Restaurant').toArray();
  if (restaurantProducts.length > 0) {
    await db.transaction('rw', db.products, async () => {
      for (const p of restaurantProducts) {
        const newCategory = p.id === 'p_5' ? 'sandwich' : 'meal';
        await db.products.update(p.id, { category: newCategory });
      }
    });
  }
  telemetry.dbInitialized = Date.now();
}

export async function seedLocalDbOptional() {
  // Clear any existing products/customers/suppliers/batches first to prevent duplicate key errors
  await Promise.all([
    db.products.clear(),
    db.batches.clear(),
    db.customers.clear(),
    db.suppliers.clear()
  ]);

  // Seed Customers
  await db.customers.bulkAdd([
    { id: 'c_1', name: 'أحمد العتيبي', phone: '0501234567', email: 'ahmed@email.com', points: 150, tier: 'gold', notes: 'عميل مميز يفضل الدفع نقداً' },
    { id: 'c_2', name: 'سارة الشمري', phone: '0559876543', email: 'sara@email.com', points: 340, tier: 'platinum', notes: 'دائمة الشراء لمنتجات التجميل' },
    { id: 'c_3', name: 'John Doe', phone: '0567891234', email: 'john@email.com', points: 20, tier: 'silver' }
  ]);

  // Seed Products
  await db.products.bulkAdd([
    { id: 'p_1', name_en: 'Organic Olive Oil 1L', name_ar: 'زيت زيتون عضوي 1 لتر', sku: 'RET-OO-01', barcode: '62811001', price: 45.0, cost: 30.0, unit: 'bottle', type: 'piece', category: 'Food', min_stock: 10, is_pharmaceutical: 0 },
    { id: 'p_2', name_en: 'Basmati Rice 5kg', name_ar: 'أرز بسمتي 5 كجم', sku: 'RET-BR-05', barcode: '62811002', price: 65.0, cost: 50.0, unit: 'bag', type: 'piece', category: 'Food', min_stock: 5, is_pharmaceutical: 0 },
    { id: 'p_3', name_en: 'Premium Dates 1kg', name_ar: 'تمر خلاص فاخر 1 كجم', sku: 'RET-PD-01', barcode: '62811003', price: 30.0, cost: 18.0, unit: 'kg', type: 'weight', category: 'Food', min_stock: 20, is_pharmaceutical: 0 },
    
    { id: 'p_4', name_en: 'Double Beef Burger Combo', name_ar: 'كومبو دبل بيف برجر', sku: 'REST-DBB-02', barcode: '8811004', price: 35.0, cost: 12.0, unit: 'meal', type: 'piece', category: 'meal', min_stock: 0, is_pharmaceutical: 0 },
    { id: 'p_5', name_en: 'Shawarma Wrap', name_ar: 'صاروخ شاورما دجاج', sku: 'REST-SW-01', barcode: '8811005', price: 12.0, cost: 4.5, unit: 'piece', type: 'piece', category: 'sandwich', min_stock: 0, is_pharmaceutical: 0 },
    { id: 'p_6', name_en: 'Classic Margherita Pizza', name_ar: 'بيتزا مارغريتا كلاسيك', sku: 'REST-MP-03', barcode: '8811006', price: 28.0, cost: 9.0, unit: 'piece', type: 'piece', category: 'meal', min_stock: 0, is_pharmaceutical: 0 },
    
    { id: 'p_7', name_en: 'Panadol Extra 48 Tablets', name_ar: 'بنادول إكسترا 48 قرص', scientific_name: 'Paracetamol + Caffeine', sku: 'PHAR-PAN-01', barcode: '3011007', price: 16.5, cost: 10.0, unit: 'box', type: 'piece', category: 'Pharmacy', min_stock: 15, is_pharmaceutical: 1 },
    { id: 'p_8', name_en: 'Amoxicillin 500mg Antibiotic', name_ar: 'أموكسيسيلين 500 ملجم مضاد', scientific_name: 'Amoxicillin Trihydrate', sku: 'PHAR-AMO-02', barcode: '3011008', price: 24.0, cost: 15.0, unit: 'box', type: 'piece', category: 'Pharmacy', min_stock: 5, is_pharmaceutical: 1 },
    { id: 'p_9', name_en: 'Voltaren Emulgel 50g', name_ar: 'فولتارين إيمولجيل 50 جرام', scientific_name: 'Diclofenac Diethylammonium', sku: 'PHAR-VOL-03', barcode: '3011009', price: 22.0, cost: 14.0, unit: 'tube', type: 'piece', category: 'Pharmacy', min_stock: 8, is_pharmaceutical: 1 },

    { id: 'p_10', name_en: 'Classic Denim Jacket', name_ar: 'جاكيت جينز كلاسيك', sku: 'CLO-DJ-01', barcode: '62820010', price: 150.0, cost: 70.0, unit: 'piece', type: 'piece', category: 'Clothing', min_stock: 5, is_pharmaceutical: 0 },
    { id: 'p_11', name_en: 'Cotton Polo Shirt', name_ar: 'قميص بولو قطن', sku: 'CLO-PS-02', barcode: '62820011', price: 85.0, cost: 35.0, unit: 'piece', type: 'piece', category: 'Clothing', min_stock: 10, is_pharmaceutical: 0 },
    { id: 'p_12', name_en: 'Floral Bohemian Dress', name_ar: 'فستان مشجر بوهيمي', sku: 'CLO-FD-03', barcode: '62820012', price: 220.0, cost: 110.0, unit: 'piece', type: 'piece', category: 'Clothing', min_stock: 4, is_pharmaceutical: 0 },
    { id: 'p_13', name_en: 'Classic Leather Boots', name_ar: 'حذاء جلدي كلاسيك', sku: 'CLO-LB-04', barcode: '62820013', price: 350.0, cost: 180.0, unit: 'pair', type: 'piece', category: 'Clothing', min_stock: 3, is_pharmaceutical: 0 }
  ]);

  // Seed Batches
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 15);

  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 2);

  await db.batches.bulkAdd([
    { id: 'b_7_near', product_id: 'p_7', warehouse_id: 'wh_main_1', batch_number: 'PAN-B992', expiry_date: tomorrow.toISOString().split('T')[0], quantity: 4 },
    { id: 'b_7_safe', product_id: 'p_7', warehouse_id: 'wh_main_1', batch_number: 'PAN-C115', expiry_date: nextYear.toISOString().split('T')[0], quantity: 50 },
    { id: 'b_8_safe', product_id: 'p_8', warehouse_id: 'wh_main_1', batch_number: 'AMO-XP20', expiry_date: nextYear.toISOString().split('T')[0], quantity: 35 },
    { id: 'b_9_near', product_id: 'p_9', warehouse_id: 'wh_main_2', batch_number: 'VOL-E082', expiry_date: tomorrow.toISOString().split('T')[0], quantity: 2 },
    { id: 'b_9_safe', product_id: 'p_9', warehouse_id: 'wh_main_1', batch_number: 'VOL-E095', expiry_date: nextYear.toISOString().split('T')[0], quantity: 18 }
  ]);

  // Seed Kitchen Raw Materials
  const rawMaterials = [
    { id: 'p_raw_bread', name_en: 'Burger Buns / Bread', name_ar: 'خبز برجر / صاج', sku: 'RAW-BREAD-01', barcode: 'raw_bread_01', price: 1.0, cost: 0.5, unit: 'piece', type: 'piece', category: 'raw_material', min_stock: 50, is_pharmaceutical: 0 },
    { id: 'p_raw_meat', name_en: 'Minced Beef', name_ar: 'لحمة مفرومة خام', sku: 'RAW-MEAT-01', barcode: 'raw_meat_01', price: 45.0, cost: 32.0, unit: 'kg', type: 'weight', category: 'raw_material', min_stock: 10, is_pharmaceutical: 0 },
    { id: 'p_raw_veggies', name_en: 'Fresh Vegetables', name_ar: 'خضار طازجة (طماطم/خس)', sku: 'RAW-VEG-01', barcode: 'raw_veg_01', price: 8.0, cost: 4.0, unit: 'kg', type: 'weight', category: 'raw_material', min_stock: 15, is_pharmaceutical: 0 },
    { id: 'p_raw_chicken', name_en: 'Raw Chicken breast', name_ar: 'دجاج فيليه خام', sku: 'RAW-CHICK-01', barcode: 'raw_chicken_01', price: 28.0, cost: 19.0, unit: 'kg', type: 'weight', category: 'raw_material', min_stock: 15, is_pharmaceutical: 0 }
  ];
  for (const m of rawMaterials) {
    await db.products.add(m as any);
    await db.batches.add({
      id: 'b_' + m.id,
      product_id: m.id,
      warehouse_id: 'wh_main_1',
      batch_number: 'BATCH-RAW-01',
      expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quantity: 100
    });
  }

  // Seed default suppliers
  await db.suppliers.bulkAdd([
    { id: 's_1', name: 'شركة الأغذية المتحدة', contact_name: 'سليمان خالد', phone: '0114992929', email: 'supplier@food.com', balance: -1500 },
    { id: 's_2', name: 'مزارع الجوف الزراعية', contact_name: 'فهد العاصم', phone: '0142999121', email: 'aljouf@farm.com', balance: 0 },
    { id: 's_3', name: 'الوطنية للدواجن', contact_name: 'صالح الأحمد', phone: '0163884848', email: 'poultry@watania.com', balance: -2400 },
    { id: 's_4', name: 'المخابز الوطنية الحديثة', contact_name: 'وليد العثمان', phone: '0114773829', email: 'modern_bakeries@mail.com', balance: 0 }
  ]);
}

export async function getCompanyDbSize(companyId: string): Promise<string> {
  try {
    const tempDb = getCompanyDbInstance(companyId);
    await tempDb.open();
    let totalRows = 0;
    const tableNames = [
      'products', 'batches', 'customers', 'orders', 
      'orderItems', 'suspendedOrders', 'suppliers', 
      'purchaseOrders', 'expenses', 'refunds', 'appSettings', 'users'
    ];
    for (const tName of tableNames) {
      if ((tempDb as any)[tName]) {
        totalRows += await (tempDb as any)[tName].count();
      }
    }
    tempDb.close();
    
    // Estimate size: 512KB base metadata + 0.5KB per record
    const sizeInKb = 512 + totalRows * 0.5;
    if (sizeInKb < 1024) {
      return `${sizeInKb.toFixed(1)} KB`;
    }
    return `${(sizeInKb / 1024).toFixed(2)} MB`;
  } catch {
    return '512.0 KB';
  }
}
