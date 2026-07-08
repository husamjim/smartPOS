import Dexie from 'dexie';
import type { Table } from 'dexie';

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
  is_pharmaceutical: number;
  image?: string;
  image_base64?: string; // base64-encoded product photo
  stock?: number;
  approval_id?: string;
  recipe?: string; // stringified Recipe JSON
  variants?: string; // stringified Variant JSON
  shipment_details?: string; // stringified Shipment JSON
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
  is_synced: number;
  created_at: string;
  refund_of_order_id?: string;
  refund_note?: string;
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
  items: string;
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
  }>;
  customer?: LocalCustomer;
  total: number;
  date: string;
  branch_id: string;
}

export interface OfflineQueueItem {
  id?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  table: 'orders' | 'customers' | 'order_items';
  payload: any;
  timestamp: string;
}

export class CashierDexieDb extends Dexie {
  products!: Table<LocalProduct>;
  batches!: Table<LocalBatch>;
  customers!: Table<LocalCustomer>;
  orders!: Table<LocalOrder>;
  orderItems!: Table<LocalOrderItem>;
  suspendedOrders!: Table<LocalSuspendedOrder>;
  offlineQueue!: Table<OfflineQueueItem>;
  suppliers!: Table<any>;
  purchaseOrders!: Table<any>;
  expenses!: Table<any>;
  refunds!: Table<LocalRefund>;

  constructor() {
    super('CashierSystemDb');
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
      expenses: 'id, branch_id, category'
    });
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
      refunds: 'id, original_order_id, refund_order_id, created_at'
    });
    this.version(3).stores({
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
      refunds: 'id, original_order_id, refund_order_id, created_at'
    });
  }
}

export const db = new CashierDexieDb();

export async function seedLocalDbIfEmpty() {
  // Migrate any legacy 'Restaurant' category products to detailed subcategories
  await db.products.where('category').equals('Restaurant').modify(p => {
    if (p.id === 'p_5') {
      p.category = 'sandwich';
    } else {
      p.category = 'meal';
    }
  });
}
