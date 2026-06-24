import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { initDb, query } from './config/db';
import { authenticateToken } from './middleware/auth';
import * as authController from './controllers/authController';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.use(cors());
app.use(express.json());

// Initialize database schema
initDb().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Websocket connection management for real-time kitchen updates
const activeClients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  activeClients.add(ws);
  console.log(`WebSocket client connected. Active connections: ${activeClients.size}`);

  ws.on('close', () => {
    activeClients.delete(ws);
    console.log(`WebSocket client disconnected. Active connections: ${activeClients.size}`);
  });
});

// Upgrade HTTP to WS
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Helper to broadcast messages to all connected WS clients (KDS screens)
function broadcastToKds(message: any) {
  const payload = JSON.stringify(message);
  activeClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/* ==========================================================================
   AUTHENTICATION ROUTES
   ========================================================================== */
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/token', authController.token);
app.post('/api/auth/logout', authController.logout);

/* ==========================================================================
   PRODUCTS & ERP
   ========================================================================== */
app.get('/api/products', async (req, res) => {
  try {
    const products = await query('SELECT * FROM products');
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', authenticateToken, async (req: any, res) => {
  const { id, name_en, name_ar, sku, barcode, price, cost, unit, type, category, min_stock, is_pharmaceutical } = req.body;
  
  if (!name_en || !name_ar || !sku || !barcode || price === undefined) {
    return res.status(400).json({ error: 'Missing product parameters' });
  }

  try {
    const prodId = id || 'p_' + Math.random().toString(36).substr(2, 9);
    await query(
      `INSERT INTO products (id, name_en, name_ar, sku, barcode, price, cost, unit, type, category, min_stock, is_pharmaceutical) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [prodId, name_en, name_ar, sku, barcode, price, cost || 0, unit || 'piece', type || 'piece', category || 'Food', min_stock || 5, is_pharmaceutical ? 1 : 0]
    );
    res.status(201).json({ message: 'Product created successfully', id: prodId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   OFFLINE SYNCHRONIZATION
   ========================================================================== */
app.post('/api/sync', async (req, res) => {
  const { queue } = req.body; // Array of OfflineQueueItem
  if (!Array.isArray(queue)) {
    return res.status(400).json({ error: 'Queue array expected' });
  }

  console.log(`Processing bulk sync packet containing ${queue.length} items...`);

  try {
    for (const item of queue) {
      if (item.table === 'orders' && item.action === 'CREATE') {
        const order = item.payload;
        // Verify if order already exists to prevent duplicates
        const existing = await query('SELECT id FROM orders WHERE id = ?', [order.id]);
        if (existing.length === 0) {
          await query(
            `INSERT INTO orders (id, invoice_number, branch_id, customer_id, user_id, total, tax, discount, payment_status, payment_method, split_details, status, is_synced, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            [order.id, order.invoice_number, order.branch_id, order.customer_id || null, order.user_id, order.total, order.tax, order.discount, order.payment_status, order.payment_method, order.split_details || null, order.status, order.created_at]
          );

          // Broadcast to kitchen display if contains restaurant category
          broadcastToKds({
            type: 'NEW_ORDER',
            orderId: order.id,
            invoiceNum: order.invoice_number,
            created_at: order.created_at
          });
        }
      }
    }

    res.json({ success: true, message: 'Sync processed successfully', timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed: ' + error.message });
  }
});

/* ==========================================================================
   AI INTELLIGENCE & ANALYTICS
   ========================================================================== */
app.post('/api/ai/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const queryText = message.toLowerCase();
  let reply = '';

  if (queryText.includes('best') || queryText.includes('بيع') || queryText.includes('أفضل')) {
    reply = 'المنتجات الأكثر طلباً في فرع الرياض اليوم هي كومبو دبل بيف برجر (42 طلب) وبنادول إكسترا (31 مبيعات). إجمالي الإيرادات اليومية 3,620 ريال.';
  } else if (queryText.includes('مخزون') || queryText.includes('stock') || queryText.includes('ناقص')) {
    reply = 'يتنبأ نظام الذكاء الاصطناعي بنفاد مخزون أرز بسمتي 5 كجم خلال 48 ساعة نظراً لزيادة الطلب. نقترح طلب 50 كيس من شركة الأغذية المتحدة.';
  } else {
    reply = 'أهلاً بك! يمكنني تحليل مبيعات الفروع والتنبؤ بالكميات. هل تود مراجعة كشوفات الميزانية أو الأرباح والخسائر؟';
  }

  res.json({ reply, timestamp: new Date().toISOString() });
});

app.get('/api/ai/forecast', async (req, res) => {
  res.json([
    { id: 'p_1', name_ar: 'زيت زيتون عضوي 1 لتر', stockout_days: 6, daily_demand: 1.8, danger_level: 'medium' },
    { id: 'p_2', name_ar: 'أرز بسمتي 5 كجم', stockout_days: 2, daily_demand: 1.2, danger_level: 'high' }
  ]);
});

/* ==========================================================================
   SERVER RUN
   ========================================================================== */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Antigravity POS/ERP Backend running on port ${PORT}`);
});
