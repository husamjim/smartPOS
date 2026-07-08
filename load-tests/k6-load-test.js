import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics to monitor performance details
const loginDuration = new Trend('login_duration');
const syncDuration = new Trend('sync_duration');
const chatDuration = new Trend('chat_duration');
const productsDuration = new Trend('products_duration');
const failureRate = new Rate('failures');

export const options = {
  scenarios: {
    // Stage 1: 50 Virtual Users
    load_50: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 }, // ramp-up to 50
        { duration: '30s', target: 50 }, // stay at 50
        { duration: '10s', target: 0 },  // ramp-down
      ],
      gracefulRampDown: '5s',
      exec: 'runTest',
    },
    // Stage 2: 100 Virtual Users
    load_100: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
      ],
      startTime: '55s', // Start after Stage 1 finishes
      gracefulRampDown: '5s',
      exec: 'runTest',
    },
    // Stage 3: 500 Virtual Users
    load_500: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 500 },
        { duration: '45s', target: 500 },
        { duration: '15s', target: 0 },
      ],
      startTime: '110s', // Start after Stage 2 finishes
      gracefulRampDown: '10s',
      exec: 'runTest',
    },
    // Stage 4: 1000 Virtual Users
    load_1000: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 1000 },
        { duration: '1m', target: 1000 },
        { duration: '20s', target: 0 },
      ],
      startTime: '190s', // Start after Stage 3 finishes
      gracefulRampDown: '15s',
      exec: 'runTest',
    },
  },
  thresholds: {
    // System-wide performance validation criteria
    http_req_failed: ['rate<0.01'], // Global failure rate must be less than 1%
    http_req_duration: ['p(95)<1500'], // 95% of requests must complete under 1.5 seconds
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000';

// Global execution function for all Virtual Users (VUs)
export function runTest() {
  const uniqueId = `${__VU}_${Math.floor(Math.random() * 1000000)}`;
  const email = `user_${uniqueId}@loadtest.com`;
  const password = 'TestPassword123';
  const name = `Load VU ${__VU}`;

  const headers = { 'Content-Type': 'application/json' };

  // 1. Register User
  const regPayload = JSON.stringify({
    name,
    email,
    password,
    role: 'cashier',
    branch_id: 'br_riyadh_main',
  });
  let res = http.post(`${BASE_URL}/api/auth/register`, regPayload, { headers });
  const regOk = check(res, {
    'register status is 201 or 400 (if exists)': (r) => r.status === 201 || r.status === 400,
  });
  failureRate.add(!regOk);

  sleep(0.5);

  // 2. Login User
  const loginPayload = JSON.stringify({ email, password });
  const loginStart = Date.now();
  res = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers });
  loginDuration.add(Date.now() - loginStart);

  const loginOk = check(res, {
    'login status is 200': (r) => r.status === 200,
    'has access token': (r) => r.json().accessToken !== undefined,
  });
  failureRate.add(!loginOk);

  if (!loginOk) {
    sleep(1);
    return; // Cannot proceed without token
  }

  const token = res.json().accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  sleep(0.5);

  // 3. Get Products Catalog
  const prodStart = Date.now();
  res = http.get(`${BASE_URL}/api/products`, { headers: authHeaders });
  productsDuration.add(Date.now() - prodStart);

  const prodOk = check(res, {
    'products status is 200': (r) => r.status === 200,
    'products is array': (r) => Array.isArray(r.json()),
  });
  failureRate.add(!prodOk);

  sleep(0.5);

  // 4. Synchronize Simulated Offline Orders (POST /api/sync)
  const syncPayload = JSON.stringify({
    queue: [
      {
        action: 'CREATE',
        table: 'orders',
        payload: {
          id: `ord_load_${uniqueId}`,
          invoice_number: `INV-L-${Date.now()}-${Math.floor(Math.random() * 90000)}`,
          branch_id: 'br_riyadh_main',
          user_id: `u_${__VU}`,
          total: 150.0,
          tax: 22.5,
          discount: 0.0,
          payment_status: 'paid',
          payment_method: 'cash',
          status: 'completed',
          created_at: new Date().toISOString(),
        },
      },
    ],
  });

  const syncStart = Date.now();
  res = http.post(`${BASE_URL}/api/sync`, syncPayload, { headers: authHeaders });
  syncDuration.add(Date.now() - syncStart);

  const syncOk = check(res, {
    'sync status is 200': (r) => r.status === 200,
    'sync response success is true': (r) => r.json().success === true,
  });
  failureRate.add(!syncOk);

  sleep(0.5);

  // 5. Ask AI Assistant
  const chatPayload = JSON.stringify({
    message: 'What are the best selling products today?',
  });

  const chatStart = Date.now();
  res = http.post(`${BASE_URL}/api/ai/chat`, chatPayload, { headers: authHeaders });
  chatDuration.add(Date.now() - chatStart);

  const chatOk = check(res, {
    'chat status is 200': (r) => r.status === 200,
    'chat response has reply': (r) => r.json().reply !== undefined,
  });
  failureRate.add(!chatOk);

  sleep(1); // Final pause before iteration restarts
}
