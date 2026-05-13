const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise-secret-2026';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'saqlain.senior21@gmail.com').toLowerCase();
const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '7');
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

const UNLOCK_API_KEY      = process.env.UNLOCK_API_KEY       || '';
const SICKW_API_KEY       = process.env.SICKW_API_KEY        || '';
const PAYONEER_EMAIL      = process.env.PAYONEER_EMAIL        || 'saqlain.senior21@gmail.com';
const PAYONEER_LINK       = process.env.PAYONEER_LINK         || '';

// Elbroos GSM API (IMEI unlock reseller)
const ELBROOS_USERNAME = process.env.ELBROOS_USERNAME || '';
const ELBROOS_API_KEY  = process.env.ELBROOS_API_KEY  || 'b9c2a1f0567f9f40c10a2ea595dcaf98';
const ELBROOS_BASE_URL = 'https://api-gsm.elbroos.com/api/v1';

// GsmServer.com API
const GSMSERVER_USERNAME = process.env.GSMSERVER_USERNAME || '';
const GSMSERVER_API_KEY  = process.env.GSMSERVER_API_KEY  || '';
const GSMSERVER_BASE_URL = 'https://www.gsmserver.com/api/';

// WiPay Caribbean (credit/debit card payments — Jamaica & Caribbean)
const WIPAY_ACCOUNT_NUMBER = process.env.WIPAY_ACCOUNT_NUMBER || '';
const WIPAY_API_KEY        = process.env.WIPAY_API_KEY        || '';
const WIPAY_CURRENCY       = process.env.WIPAY_CURRENCY       || 'USD';
const WIPAY_ENVIRONMENT    = process.env.WIPAY_ENVIRONMENT    || '1'; // 1=live, 0=sandbox
const WIPAY_FEE_STRUCTURE  = process.env.WIPAY_FEE_STRUCTURE  || '0'; // 0=customer pays fee, 1=merchant absorbs

// ─── Resend Email ─────────────────────────────────────────────────────────────
const { Resend } = require('resend');
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('[Mail] Resend ready');
} else {
  console.warn('[Mail] Email not configured — set RESEND_API_KEY in .env');
}
const SICKW_SERVICE_ID    = process.env.SICKW_SERVICE_ID     || '203';
const IMEI_CHECK_API_KEY  = process.env.IMEI_CHECK_API_KEY   || '';
const IMEI_CHECK_SERVICE_ID = process.env.IMEI_CHECK_SERVICE_ID || '1';

// Stripe (optional)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_4eC39')) {
  try { stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); }
  catch (e) { console.warn('stripe package not found — run: npm install stripe'); }
}

// ─── Database ────────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'enterprise.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    email    TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    balance  REAL DEFAULT 0.00,
    role     TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS services (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    price          REAL NOT NULL,
    cost_price     REAL DEFAULT 0,
    category       TEXT,
    delivery       TEXT,
    type           TEXT DEFAULT 'server',
    api_service_id TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER,
    service_id        INTEGER,
    imei              TEXT,
    status            TEXT DEFAULT 'in process',
    date              DATETIME DEFAULT CURRENT_TIMESTAMP,
    external_order_id TEXT,
    api_status        TEXT,
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER UNIQUE,
    plan                TEXT DEFAULT 'none',
    status              TEXT DEFAULT 'trial',
    trial_ends_at       DATETIME,
    current_period_end  DATETIME,
    stripe_sub_id       TEXT,
    stripe_customer_id  TEXT,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS newsletter_broadcasts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    subject     TEXT NOT NULL,
    body        TEXT NOT NULL,
    sent_count  INTEGER DEFAULT 0,
    fail_count  INTEGER DEFAULT 0,
    status      TEXT DEFAULT 'pending',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at     DATETIME
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT UNIQUE NOT NULL,
    source     TEXT DEFAULT 'website',
    subscribed INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS topup_requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    amount      REAL NOT NULL,
    reference   TEXT NOT NULL,
    method      TEXT DEFAULT 'payoneer',
    status      TEXT DEFAULT 'pending',
    note        TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ─── Safe column migrations (idempotent) ─────────────────────────────────────
const tableInfo = (tbl) => db.pragma(`table_info(${tbl})`).map(r => r.name);
const addColIfMissing = (tbl, col, def) => {
  if (!tableInfo(tbl).includes(col)) {
    db.exec(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${def}`);
    console.log(`Migration: added ${tbl}.${col}`);
  }
};

// ─── Settings helpers ─────────────────────────────────────────────────────────
const getSetting  = (key, fallback = null) => { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key); return r ? r.value : fallback; };
const setSetting  = (key, value) => db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value));

// Apply global profit margin to a cost price
// Minimum floors: checks $0.49, file $4.99, everything else $5.99
function applyMargin(costPrice, marginPct, type) {
  if (!marginPct || marginPct <= 0) return null;
  const raw = costPrice * (1 + marginPct / 100);
  // Round up to nearest .99 (e.g. $5.10 → $5.99, $16.20 → $16.99)
  const rounded = Math.ceil(raw) - 0.01;
  const floors = { check: 0.49, file: 4.99 };
  const floor = floors[type] || 5.99;
  return Math.max(rounded, floor);
}
addColIfMissing('services', 'cost_price', 'REAL DEFAULT 0');
addColIfMissing('services', 'api_service_id', 'TEXT');
addColIfMissing('orders', 'external_order_id', 'TEXT');
addColIfMissing('orders', 'api_status', 'TEXT');
addColIfMissing('orders', 'profit_earned', 'REAL DEFAULT 0');
addColIfMissing('topup_requests', 'wipay_tx_id', 'TEXT');
addColIfMissing('topup_requests', 'wipay_order_id', 'TEXT');
// Public order columns (guest orders from website)
addColIfMissing('services', 'elbroos_service_id', 'TEXT');
addColIfMissing('services', 'gsmserver_service_id', 'TEXT');
addColIfMissing('orders', 'provider', "TEXT DEFAULT 'unlockbase'");
addColIfMissing('orders', 'email', 'TEXT');
addColIfMissing('orders', 'notes', 'TEXT');
addColIfMissing('orders', 'order_id', 'TEXT');
addColIfMissing('orders', 'result', 'TEXT');
addColIfMissing('orders', 'created_at', "DATETIME DEFAULT '2026-01-01 00:00:00'");
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id)'); } catch (_) {}

// ─── Service catalogue — retail prices with profit margin ────────────────────
// Format: [name, retail_price, cost_price, category, delivery, type, api_service_id]
// Cost prices based on GsmServer wholesale rates (May 2026)
// Profit margins: Server tools ~30-40%, IMEI unlock ~75-85%, FRP ~72-82%, Checks ~90%+
const SERVICE_CATALOGUE = [
  // ── Server / Tool Licences ──
  ['Adam Tool Credit For Xiaomi/OnePlus/Realme [Existing User]',    0.99,  0.48,  'Adam Tool',          'Instant',    'server', null],
  ['Ameer Tool (Hardware Tool) 1 PC - 3 Month [Digital License]',  32.99, 18.50,  'Ameer Tool',          'Instant',    'server', null],
  ['Ameer Tool (Hardware Tool) 1 PC - 6 Month [Digital License]',  44.99, 26.00,  'Ameer Tool',          'Instant',    'server', null],
  ['Android Multi Tool (AMT) Server Credits',                        1.49,  0.90,  'Android Multi Tool',  'Instant',    'server', null],
  ['Android Multi Tool - 3 Month Activation (AMT)',                 14.99,  8.50,  'Android Multi Tool',  'Instant',    'server', null],
  ['Xiaomi Anonymous Tool Credits for Existing User',                0.69,  0.28,  'Anonymous Xiaomi',    'Instant',    'server', null],
  ['Borneo Schematics Hardware Tool Activation [1 Year]',           49.99, 30.00,  'Borneo Schematics',   'Instant',    'server', null],
  ['Chimera Tool Basic (Instant API)',                              119.99, 78.00,  'Chimera Tool',        'Instant',    'server', null],
  ['Sigma Plus 1 Month Digital License',                            49.99, 34.00,  'Sigma Plus',          'Instant',    'server', null],
  ['DFT Pro Tool Activation [New User] 1 Year',                    119.99, 80.00,  'DFT Tool',            '1-12 Hours', 'server', null],
  ['UnlockTool 12 Months License [New / Renew]',                   179.99,135.00,  'Unlock Tool',         '1-12 Hours', 'server', null],
  ['Z3X Sam Tool Activation',                                       89.99, 60.00,  'Z3X Box',             'Instant',    'server', null],
  // ── IMEI Unlock — costs based on GsmServer wholesale (May 2026) ──
  ['iPhone Factory Unlock - T-Mobile USA (All Models)',             24.99,  5.50,  'iPhone Unlock',       '1-3 Days',   'imei',   null],
  ['iPhone Factory Unlock - AT&T USA (All Models)',                 19.99,  4.00,  'iPhone Unlock',       '1-5 Days',   'imei',   null],
  ['iPhone Factory Unlock - Verizon USA (All Models)',              34.99, 12.00,  'iPhone Unlock',       '2-7 Days',   'imei',   null],
  ['iPhone Factory Unlock - Sprint / Metro USA (All Models)',       19.99,  3.50,  'iPhone Unlock',       '1-3 Days',   'imei',   null],
  ['Samsung Factory Unlock - T-Mobile USA (All Models)',            14.99,  2.50,  'Samsung Unlock',      '1-24 Hours', 'imei',   null],
  ['Samsung Factory Unlock - AT&T USA (All Models)',                22.99,  8.50,  'Samsung Unlock',      '1-24 Hours', 'imei',   null],
  ['Motorola Network Unlock - All USA Carriers',                    12.99,  1.50,  'Motorola Unlock',     'Instant',    'imei',   null],
  ['LG Factory Unlock - Premium Service (All Models)',              14.99,  2.50,  'LG Unlock',           '1-12 Hours', 'imei',   null],
  ['Google Pixel Unlock - All Carriers (All Models)',               19.99,  4.50,  'Google Unlock',       'Instant',    'imei',   null],
  ['Huawei Factory Unlock - All Models & Carriers',                 24.99,  6.50,  'Huawei Unlock',       '1-3 Days',   'imei',   null],
  ['OnePlus Network Unlock - All Carriers',                         13.99,  2.00,  'OnePlus Unlock',      'Instant',    'imei',   null],
  ['Xiaomi / Redmi Factory Unlock Service',                         14.99,  3.00,  'Xiaomi Unlock',       '1-24 Hours', 'imei',   null],
  // ── FRP Remove by IMEI — GsmServer wholesale costs ──
  // ── Samsung FRP — Series A (Mid-Range) ──
  ['Samsung Series A FRP Remove - Android 16/17 (A14/A25/A35/A55)',          15.99,  4.50,  'FRP By IMEI',  '1-6 Hours',  'imei',   null],
  ['Samsung Series A FRP Remove - Android 16/17 Latest Binary/Bit',          18.99,  6.00,  'FRP By IMEI',  '1-6 Hours',  'imei',   null],
  ['Samsung Series A FRP Remove - Android 11/12/13/14 (A12/A13/A32/A52)',    12.99,  3.00,  'FRP By IMEI',  '1-6 Hours',  'imei',   null],
  ['Samsung Series A FRP Remove - Android 9/10 (A10/A20/A30/A50)',            9.99,  1.80,  'FRP By IMEI',  '1-6 Hours',  'imei',   null],
  // ── Samsung FRP — Series S (Flagship) ──
  ['Samsung Series S FRP Remove - Android 16/17 (S24/S25/Ultra)',             24.99,  8.00,  'FRP By IMEI',  '1-6 Hours',  'imei',   null],
  ['Samsung Series S FRP Remove - Android 16/17 Latest Binary/Bit',          28.99, 10.00,  'FRP By IMEI',  '1-6 Hours',  'imei',   null],
  ['Samsung Series S FRP Remove - Android 11/12/13/14 (S21/S22/S23)',        19.99,  5.50,  'FRP By IMEI',  '1-6 Hours',  'imei',   null],
  ['Samsung Series S FRP Remove - Android 9/10 (S10/S20)',                   14.99,  3.50,  'FRP By IMEI',  '1-6 Hours',  'imei',   null],
  ['Google Pixel FRP / Google Account Remove By IMEI',              14.99,  4.50,  'FRP By IMEI',         '1-12 Hours', 'imei',   null],
  ['Xiaomi / Redmi FRP & Mi Account Remove By IMEI',                 9.99,  2.80,  'FRP By IMEI',         '1-12 Hours', 'imei',   null],
  ['Huawei FRP / Google Account Remove By IMEI',                     9.99,  2.50,  'FRP By IMEI',         '1-6 Hours',  'imei',   null],
  ['Oppo / Realme FRP Remove By IMEI (All Models)',                   8.99,  2.00,  'FRP By IMEI',         '1-24 Hours', 'imei',   null],
  ['Tecno / Infinix / iTel FRP Remove By IMEI',                      7.99,  1.80,  'FRP By IMEI',         '1-24 Hours', 'imei',   null],
  ['Motorola FRP / Google Account Remove By IMEI',                    8.99,  2.00,  'FRP By IMEI',         '1-12 Hours', 'imei',   null],
  ['LG FRP / Google Account Remove By IMEI',                          8.99,  2.00,  'FRP By IMEI',         '1-12 Hours', 'imei',   null],
  ['OnePlus FRP / Google Account Remove By IMEI',                     8.99,  2.00,  'FRP By IMEI',         '1-12 Hours', 'imei',   null],
  ['Universal Android FRP Remove By IMEI (Any Brand)',               13.99,  3.50,  'FRP By IMEI',         '1-24 Hours', 'imei',   null],
  // ── Remote Services ──
  ['Xiaomi Mi Account Remove - Permanent',                           19.99,  9.00,  'Xiaomi Mi Account',   '1-12 Hours', 'remote', null],
  ['Tecno / Infinix / iTel MDM Remove Permanent',                    13.99,  5.50,  'Tecno MDM',           '1-24 Hours', 'remote', null],
  ['Samsung MDM Remove - Knox Bypass Service',                      129.99, 50.00,  'Samsung MDM',         '1-12 Hours', 'remote', null],
  ['iPhone iCloud Activation Lock Remove',                          139.99, 55.00,  'iCloud Unlock',       '2-7 Days',   'remote', null],
  ['Android Screen Lock Remove (PIN / Pattern / Password)',           12.99,  3.00,  'Screen Unlock',       '1-3 Hours',  'remote', null],
  // ── File Services ──
  ['Samsung Flash File - U/U1 Binary (Latest Official)',              9.99,  2.50,  'Samsung Firmware',    'Instant',    'file',   null],
  ['Xiaomi Firmware Flash File - Latest MIUI',                        6.99,  1.80,  'Xiaomi Firmware',     'Instant',    'file',   null],
  ['Huawei Stock ROM / Firmware Package',                             7.99,  2.20,  'Huawei Firmware',     'Instant',    'file',   null],
  ['Tecno / Infinix Stock Firmware Package',                          5.99,  1.50,  'Tecno Firmware',      'Instant',    'file',   null],
  ['Samsung ENG Boot File (Root / EFS Backup)',                      13.99,  4.00,  'Samsung ENG',         'Instant',    'file',   null],
  ['MTK CPU Auth / DA File Service',                                  9.99,  2.50,  'MTK Auth File',       'Instant',    'file',   null],
  // ── IMEI Check / SickW — costs verified May 2026 from live SickW API ──
  ['IMEI Full Bundle - Brand + iCloud + SIM Lock',                    1.49,  0.065, 'IMEI Check',          'Instant',    'check',  'bundle'],
  ['iCloud / FMI Status Check',                                       0.69,  0.02,  'IMEI Check',          'Instant',    'check',  '3'],
  ['iPhone SIM-Lock / Carrier Check',                                 0.69,  0.025, 'IMEI Check',          'Instant',    'check',  '8'],
  ['Apple Basic Info Check (GSX)',                                    0.99,  0.05,  'IMEI Check',          'Instant',    'check',  '30'],
  ['Apple Serial Number Info Check',                                  0.69,  0.01,  'IMEI Check',          'Instant',    'check',  '26'],
  ['Apple Activation Status Check',                                   0.69,  0.03,  'IMEI Check',          'Instant',    'check',  '101'],
  ['Samsung Info - Pro Check',                                        1.49,  0.10,  'IMEI Check',          'Instant',    'check',  '1'],
  ['Google Pixel Info Check',                                         2.49,  0.12,  'IMEI Check',          'Instant',    'check',  '42'],
  ['Motorola Info Check',                                             1.49,  0.08,  'IMEI Check',          'Instant',    'check',  '13'],
  ['Huawei Info Check',                                               1.49,  0.10,  'IMEI Check',          'Instant',    'check',  '15'],
  ['WW Blacklist Status - Pro',                                       2.49,  0.12,  'IMEI Check',          'Instant',    'check',  '6'],
  ['Verizon USA Status Check',                                        0.99,  0.05,  'IMEI Check',          'Instant',    'check',  '9'],
  ['T-Mobile USA Status - Pro',                                       0.99,  0.05,  'IMEI Check',          'Instant',    'check',  '16'],
  ['Cricket USA Status - Pro',                                        2.49,  0.15,  'IMEI Check',          'Instant',    'check',  '21'],
];

// Upsert seeder — updates prices on every restart, inserts new services
{
  // Ensure unique index exists BEFORE preparing ON CONFLICT statement
  try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_services_name ON services(name)'); } catch (_) {}

  const upsert = db.prepare(`
    INSERT INTO services (name, price, cost_price, category, delivery, type, api_service_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      price          = excluded.price,
      cost_price     = excluded.cost_price,
      category       = excluded.category,
      delivery       = excluded.delivery,
      type           = excluded.type,
      api_service_id = COALESCE(excluded.api_service_id, services.api_service_id)
  `);
  const seedAll = db.transaction(() => { for (const r of SERVICE_CATALOGUE) upsert.run(...r); });
  seedAll();
  console.log(`Service catalogue synced (${SERVICE_CATALOGUE.length} services)`);
}

// ─── Auto-seed admin account ──────────────────────────────────────────────────
async function seedAdmin() {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) return;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (existing) return;
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  db.prepare('INSERT INTO users (email, password, balance, role) VALUES (?, ?, 0, ?)').run(ADMIN_EMAIL, hash, 'admin');
  db.prepare('INSERT INTO subscriptions (user_id, plan, status) VALUES (?, ?, ?)').run(
    db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL).id, 'enterprise', 'active'
  );
  console.log('[Seed] Admin account created:', ADMIN_EMAIL);
}
seedAdmin().catch(console.error);

// ─── UnlockBase API helpers ───────────────────────────────────────────────────
// API v2/v3 — POST form-encoded to https://www.unlockbase.com/api/
// Response JSON: {"apiversion":"2.0.0", "ERROR":[{"MESSAGE":"..."}]}
//   or success:  {"apiversion":"2.0.0", "balance":{"BALANCE":"25.50",...}}
//                {"apiversion":"2.0.0", "order":{"ORDER_ID":"123","STATUS":"In Progress",...}}
const UNLOCK_API_URL = 'https://www.unlockbase.com/api/';

async function unlockBaseRequest(params) {
  if (!UNLOCK_API_KEY) return { ok: false, error: 'UNLOCK_API_KEY not configured' };
  try {
    const body = new URLSearchParams({ secret: UNLOCK_API_KEY, ...params });
    const { data } = await axios.post(UNLOCK_API_URL, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 20000,
    });
    if (data.ERROR) {
      const msg = Array.isArray(data.ERROR) ? data.ERROR[0]?.MESSAGE : data.ERROR;
      return { ok: false, error: msg || 'API error', raw: data };
    }
    return { ok: true, raw: data, ...data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function submitToUnlockBase(apiServiceId, imei) {
  if (!UNLOCK_API_KEY) return { success: false, reason: 'API key not configured' };
  if (!apiServiceId)   return { success: false, reason: 'Service not mapped to UnlockBase' };
  const r = await unlockBaseRequest({ type: 'add', service: String(apiServiceId), imei });
  if (!r.ok) return { success: false, reason: r.error };
  const order = r.order || r.ORDER || {};
  const orderId = order.ORDER_ID || order.order_id;
  if (orderId) return { success: true, orderId: String(orderId), apiStatus: order.STATUS || 'in process' };
  return { success: false, reason: 'No order ID in response', raw: r.raw };
}

async function checkUnlockBaseOrder(externalOrderId) {
  if (!UNLOCK_API_KEY || !externalOrderId) return null;
  const r = await unlockBaseRequest({ type: 'check', order_id: String(externalOrderId) });
  if (!r.ok) return null;
  const order = r.order || r.ORDER || r;
  return {
    imei_status: order.STATUS || order.status || '',
    code:        order.CODE   || order.code   || null,
  };
}

async function getUnlockBaseBalance() {
  const r = await unlockBaseRequest({ type: 'balance' });
  if (!r.ok) return null;
  const bal = r.balance || r.BALANCE || {};
  return parseFloat(bal.BALANCE || bal.balance || bal || '0') || null;
}

// Map UnlockBase status strings → our internal status values
function mapUnlockStatus(apiStatus) {
  if (!apiStatus) return null;
  const s = String(apiStatus).toLowerCase();
  if (s.includes('complet') || s.includes('unlock') || s.includes('done') || s.includes('success')) return 'completed';
  if (s.includes('fail') || s.includes('reject') || s.includes('error') || s.includes('invalid')) return 'failed';
  if (s.includes('cancel')) return 'cancelled';
  return 'in process';
}

// ─── SICKW IMEI Check (primary) ──────────────────────────────────────────────
// Docs: https://sickw.com — register free, get API key from Dashboard
// Service IDs: 203=Brand&Model($0.02), 3=iCloud($0.02), 8=SIM-Lock($0.025)
//              30=Apple Basic($0.05), 26=Apple Serial($0.01), 37=SIM/ICCID(free)
async function sickwCheck(imei, serviceId) {
  const { data } = await axios.get('https://sickw.com/api.php', {
    params: { format: 'json', key: SICKW_API_KEY, service: serviceId, imei },
    timeout: 15000,
  });
  return data; // { status: 'success'|'error', result: '...', imei: '...' }
}

async function runIMEICheck(imei) {
  // ── Try SICKW first (primary) ──
  if (SICKW_API_KEY) {
    try {
      // Run Brand/Model (203) as primary. Also pull iCloud (3) and SIM-Lock (8) in parallel.
      const [brandRes, icloudRes, simRes] = await Promise.allSettled([
        sickwCheck(imei, SICKW_SERVICE_ID || '203'),
        sickwCheck(imei, '3'),
        sickwCheck(imei, '8'),
      ]);

      // SICKW status can be 'success' or 'rejected' (rejected = service not applicable to this device)
      const brandRaw   = brandRes.status  === 'fulfilled' && brandRes.value?.status  === 'success'  ? brandRes.value.result  : null;
      const icloudRaw  = icloudRes.status === 'fulfilled' && ['success','rejected'].includes(icloudRes.value?.status) ? icloudRes.value.result : null;
      const simRaw     = simRes.status    === 'fulfilled' && ['success','rejected'].includes(simRes.value?.status)    ? simRes.value.result    : null;

      if (!brandRaw) {
        // Brand lookup failed completely — check if API key is wrong
        const errMsg = brandRes.value?.result || 'SICKW API error';
        console.warn('[SICKW] Brand check failed:', errMsg);
        if (errMsg.toLowerCase().includes('api key')) throw new Error(errMsg);
        return { success: false, reason: errMsg };
      }

      // ── Parse SICKW brand result ──────────────────────────────────────────────
      // SICKW service 203 returns HTML-like "Key: Value<br>Key: Value<br>..." lines
      // e.g. "IMEI: 352099...<br>Manufacturer: ALCATEL<br>Model Name: ONE TOUCH 333<br>"
      // Some Apple results use pipe-separated: "Apple | iPhone 13 | Blue | 256GB"
      function parseSickwBrand(raw) {
        if (!raw) return {};
        // Strip any residual HTML tags
        const clean = raw.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();
        // If pipe-separated (old format or some services)
        if (raw.includes('|') && !raw.includes(':')) {
          const parts = raw.split('|').map(s => s.trim());
          return { brand: parts[0], deviceName: parts[1], color: parts[2], storage: parts[3] };
        }
        // Parse "Key: Value" lines
        const map = {};
        clean.split('\n').forEach(line => {
          const idx = line.indexOf(':');
          if (idx > 0) {
            const k = line.slice(0, idx).trim().toLowerCase().replace(/\s+/g, '_');
            const v = line.slice(idx + 1).trim();
            if (v) map[k] = v;
          }
        });
        return {
          brand:      map['manufacturer'] || map['brand']      || null,
          deviceName: map['model_name']   || map['model_code'] || map['manufacturer'] || raw,
          modelCode:  map['model_code']   || null,
          color:      map['color']        || null,
          storage:    map['storage']      || map['capacity']   || null,
          imei:       map['imei']         || null,
          _raw_keys:  map,
        };
      }

      const parsed = parseSickwBrand(brandRaw);

      // iCloud / SIM: "rejected" means service not applicable (non-Apple device) → treat as N/A
      const icloudStatus = icloudRes.value?.status === 'rejected' ? 'N/A (non-Apple device)' : (icloudRaw || null);
      const simLockStatus = simRes.value?.status   === 'rejected' ? 'N/A (non-Apple device)' : (simRaw   || null);

      const properties = {
        brand:           parsed.brand      || null,
        deviceName:      parsed.deviceName || null,
        modelCode:       parsed.modelCode  || null,
        color:           parsed.color      || null,
        storage:         parsed.storage    || null,
        icloudStatus:    icloudStatus,
        simLock:         simLockStatus,
        blacklistStatus: null,   // needs separate paid service
        network:         null,   // needs service 103 ($0.06)
      };

      console.log(`[SICKW] ${imei} → ${parsed.brand} ${parsed.deviceName} | iCloud: ${icloudStatus} | SIM: ${simLockStatus}`);
      return {
        success: true,
        provider: 'SICKW',
        result: { properties },
        raw: { brand: brandRaw, icloud: icloudRaw, simLock: simRaw },
      };
    } catch (err) {
      console.error('[SICKW] Error:', err.message);
      // Fall through to imeicheck.net if configured
    }
  }

  // ── Fallback: imeicheck.net ──
  if (IMEI_CHECK_API_KEY) {
    try {
      const { data } = await axios.post(
        'https://api.imeicheck.net/v1/checks',
        { deviceId: imei, serviceId: parseInt(IMEI_CHECK_SERVICE_ID) },
        {
          headers: { Authorization: `Bearer ${IMEI_CHECK_API_KEY}`, 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );
      return { success: true, provider: 'imeicheck.net', result: data };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error('[IMEICheck.net] Error:', msg);
      return { success: false, reason: msg };
    }
  }

  // ── Demo mode: return realistic mock data so the UI can be tested ──
  // Remove this block once you add a real SICKW_API_KEY to .env
  const demoImeis = {
    '352099001761481': { brand: 'Apple', deviceName: 'iPhone 13 Pro', color: 'Sierra Blue', storage: '256GB', icloud: 'iCloud Activation Lock: OFF', simLock: 'SIM Lock: Unlocked' },
    '356728114583981': { brand: 'Samsung', deviceName: 'Galaxy S23 Ultra', color: 'Phantom Black', storage: '512GB', icloud: null, simLock: 'SIM Lock: Locked (T-Mobile)' },
    '013547001234567': { brand: 'Apple', deviceName: 'iPhone 12', color: 'Black', storage: '128GB', icloud: 'iCloud Activation Lock: ON', simLock: 'SIM Lock: Locked (AT&T)' },
  };
  const demo = demoImeis[imei] || {
    brand: 'Apple', deviceName: 'iPhone 14', color: 'Midnight', storage: '128GB',
    icloud: 'iCloud Activation Lock: OFF', simLock: 'SIM Lock: Unlocked',
  };
  console.log(`[DEMO] Returning mock IMEI data for ${imei} — set SICKW_API_KEY for real lookups`);
  return {
    success: true,
    provider: 'DEMO (no API key)',
    demo: true,
    result: {
      properties: {
        brand:           demo.brand,
        deviceName:      demo.deviceName,
        color:           demo.color,
        storage:         demo.storage,
        icloudStatus:    demo.icloud,
        simLock:         demo.simLock,
        blacklistStatus: 'Clean',
        network:         null,
      },
    },
    raw: { brand: `${demo.brand} | ${demo.deviceName} | ${demo.color} | ${demo.storage}`, icloud: demo.icloud, simLock: demo.simLock },
    note: 'DEMO DATA — Add SICKW_API_KEY to .env for real results (free at sickw.com)',
  };
}

// ─── Background order status poller (smart — 2 min for recent, 10 min for older) ──
function mapElbroosStatus(data) {
  if (!data) return null;
  const s = String(data.Status || data.status || '').toLowerCase();
  if (s.includes('complet') || s.includes('unlock') || s.includes('done') || s.includes('success')) return 'completed';
  if (s.includes('fail') || s.includes('reject') || s.includes('error') || s.includes('invalid')) return 'failed';
  if (s.includes('cancel')) return 'cancelled';
  return null;
}

// ─── GsmServer.com API Integration ───────────────────────────────────────────
function mapGsmServerStatus(status) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  if (s.includes('complet') || s.includes('unlock') || s.includes('done') || s.includes('success')) return 'completed';
  if (s.includes('fail') || s.includes('reject') || s.includes('error') || s.includes('invalid')) return 'failed';
  if (s.includes('cancel')) return 'cancelled';
  return null;
}

async function gsmServerRequest(params) {
  if (!GSMSERVER_USERNAME || !GSMSERVER_API_KEY) return { ok: false, error: 'GSMSERVER_USERNAME / GSMSERVER_API_KEY not configured' };
  try {
    const body = new URLSearchParams({ login: GSMSERVER_USERNAME, apikey: GSMSERVER_API_KEY, ...params });
    const { data } = await axios.post(GSMSERVER_BASE_URL, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 20000,
    });
    return { ok: true, data };
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    console.error('[GsmServer]', params.action, 'error:', msg);
    return { ok: false, error: msg };
  }
}

async function submitToGsmServer(serviceId, imei) {
  if (!GSMSERVER_USERNAME || !GSMSERVER_API_KEY) return { success: false, reason: 'GsmServer not configured — set GSMSERVER_USERNAME and GSMSERVER_API_KEY' };
  const r = await gsmServerRequest({ action: 'addorder', service_id: String(serviceId), imei });
  if (!r.ok) return { success: false, reason: r.error };
  const d = r.data;
  if (d?.order_id) return { success: true, orderId: String(d.order_id), apiStatus: d.status || 'in process' };
  if (d?.error)    return { success: false, reason: d.error };
  return { success: false, reason: 'Unexpected GsmServer response', raw: d };
}

async function checkGsmServerOrder(externalOrderId) {
  if (!GSMSERVER_USERNAME || !GSMSERVER_API_KEY || !externalOrderId) return null;
  const r = await gsmServerRequest({ action: 'getorderstatus', order_id: String(externalOrderId) });
  return r.ok ? r.data : null;
}

async function getGsmServerBalance() {
  const r = await gsmServerRequest({ action: 'getbalance' });
  return r.ok ? r.data : null;
}

async function pollPendingOrders() {
  const now = Date.now();
  const pending = db.prepare(
    "SELECT id, external_order_id, provider, date FROM orders WHERE external_order_id IS NOT NULL AND status = 'in process'"
  ).all();
  if (!pending.length) return;

  for (const order of pending) {
    const ageMs = now - new Date(order.date).getTime();
    const isRecent = ageMs < 60 * 60 * 1000;
    if (!isRecent && order._slowPoll) continue;

    const provider = order.provider || 'unlockbase';

    if (provider === 'gsmserver') {
      const result = await checkGsmServerOrder(order.external_order_id);
      if (!result) continue;
      const mapped = mapGsmServerStatus(result.status || result.Status);
      const unlockCode = result.unlock_code || result.code || result.Code || null;
      if (mapped && mapped !== 'in process') {
        db.prepare('UPDATE orders SET status = ?, api_status = ?, result = ? WHERE id = ?')
          .run(mapped, result.status || mapped, unlockCode ? JSON.stringify({ code: unlockCode, raw: result }) : null, order.id);
        io.emit('order_updated');
        console.log(`[GsmServer Poller] Order #${order.id} → ${mapped}`);
      } else {
        db.prepare('UPDATE orders SET api_status = ? WHERE id = ?').run(result.status || 'in process', order.id);
      }
    } else if (provider === 'elbroos') {
      const result = await checkElbroosOrder(order.external_order_id);
      if (!result) continue;
      const mapped = mapElbroosStatus(result);
      const unlockCode = result.Result || result.Code || result.code || null;
      if (mapped && mapped !== 'in process') {
        db.prepare('UPDATE orders SET status = ?, api_status = ?, result = ? WHERE id = ?')
          .run(mapped, result.Status || mapped, unlockCode ? JSON.stringify({ code: unlockCode, raw: result }) : null, order.id);
        io.emit('order_updated');
        console.log(`[Elbroos Poller] Order #${order.id} → ${mapped}`);
      } else {
        db.prepare('UPDATE orders SET api_status = ? WHERE id = ?').run(result.Status || 'in process', order.id);
      }
    } else if (UNLOCK_API_KEY) {
      const result = await checkUnlockBaseOrder(order.external_order_id);
      if (!result) continue;
      const humanStatus = result.imei_status || result.status || '';
      const mapped = mapUnlockStatus(humanStatus);
      const unlockCode = result.code || null;
      if (mapped && mapped !== 'in process') {
        db.prepare('UPDATE orders SET status = ?, api_status = ?, result = ? WHERE id = ?')
          .run(mapped, humanStatus, unlockCode ? JSON.stringify({ code: unlockCode }) : null, order.id);
        io.emit('order_updated');
        console.log(`[Poller] Order #${order.id} → ${mapped} | Code: ${unlockCode || 'none'}`);
      } else {
        db.prepare('UPDATE orders SET api_status = ? WHERE id = ?').run(humanStatus || 'in process', order.id);
      }
    }
  }
}

// Fast poll: every 2 minutes for recent orders
setInterval(pollPendingOrders, 2 * 60 * 1000);

// Slow poll: every 10 minutes
setInterval(async () => {
  const pending = db.prepare(
    "SELECT id, external_order_id, provider FROM orders WHERE external_order_id IS NOT NULL AND status = 'in process'"
  ).all();
  if (!pending.length) return;
  console.log(`[Poller-10m] Checking ${pending.length} pending order(s)...`);
  for (const order of pending) {
    const provider = order.provider || 'unlockbase';
    if (provider === 'gsmserver') {
      const result = await checkGsmServerOrder(order.external_order_id);
      if (!result) continue;
      const mapped = mapGsmServerStatus(result.status || result.Status);
      const unlockCode = result.unlock_code || result.code || result.Code || null;
      if (mapped) {
        db.prepare('UPDATE orders SET status = ?, api_status = ?, result = ? WHERE id = ?')
          .run(mapped, result.status || mapped, unlockCode ? JSON.stringify({ code: unlockCode, raw: result }) : null, order.id);
        io.emit('order_updated');
      }
    } else if (provider === 'elbroos') {
      const result = await checkElbroosOrder(order.external_order_id);
      if (!result) continue;
      const mapped = mapElbroosStatus(result);
      const unlockCode = result.Result || result.Code || result.code || null;
      if (mapped) {
        db.prepare('UPDATE orders SET status = ?, api_status = ?, result = ? WHERE id = ?')
          .run(mapped, result.Status || mapped, unlockCode ? JSON.stringify({ code: unlockCode, raw: result }) : null, order.id);
        io.emit('order_updated');
      }
    } else if (UNLOCK_API_KEY) {
      const result = await checkUnlockBaseOrder(order.external_order_id);
      if (!result) continue;
      const humanStatus = result.imei_status || result.status || '';
      const mapped = mapUnlockStatus(humanStatus);
      const unlockCode = result.code || null;
      if (mapped && mapped !== 'in process') {
        db.prepare('UPDATE orders SET status = ?, api_status = ?, result = ? WHERE id = ?')
          .run(mapped, humanStatus, unlockCode ? JSON.stringify({ code: unlockCode }) : null, order.id);
        io.emit('order_updated');
      }
    }
  }
}, 10 * 60 * 1000);

// ─── Subscription helpers ─────────────────────────────────────────────────────
function getSubscription(userId) {
  let sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  if (!sub) return null;
  const now = new Date();
  if (sub.status === 'trial' && sub.trial_ends_at && now > new Date(sub.trial_ends_at)) {
    db.prepare("UPDATE subscriptions SET status = 'expired' WHERE user_id = ?").run(userId);
    sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  }
  if (sub.status === 'active' && sub.current_period_end && now > new Date(sub.current_period_end)) {
    db.prepare("UPDATE subscriptions SET status = 'expired' WHERE user_id = ?").run(userId);
    sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  }
  return sub;
}

function isSubActive(userId) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (user?.role === 'admin') return true;
  const sub = getSubscription(userId);
  return sub && ['active', 'trial'].includes(sub.status);
}

function ensureTrialSub(userId) {
  const existing = db.prepare('SELECT id FROM subscriptions WHERE user_id = ?').get(userId);
  if (!existing) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    db.prepare('INSERT INTO subscriptions (user_id, plan, status, trial_ends_at) VALUES (?, ?, ?, ?)')
      .run(userId, 'trial', 'trial', trialEnd.toISOString());
  }
}

function ensureAdminSub(userId) {
  const s = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  if (!s) {
    db.prepare("INSERT INTO subscriptions (user_id, plan, status) VALUES (?, 'enterprise', 'active')").run(userId);
  } else if (s.status !== 'active') {
    db.prepare("UPDATE subscriptions SET status = 'active', plan = 'enterprise' WHERE user_id = ?").run(userId);
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Auth required' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
};

const requireSub = (req, res, next) => {
  if (!isSubActive(req.user.id)) return res.status(402).json({ error: 'Active subscription required' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

// ─── Plans ────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'starter', name: 'Starter', price: 29,
    features: ['IMEI Services', 'Server Services', '50 Orders/Month', 'Email Support'],
    stripe_price_id: process.env.STRIPE_PRICE_STARTER || '',
  },
  {
    id: 'pro', name: 'Professional', price: 59, popular: true,
    features: ['Everything in Starter', 'Remote Services', 'File Services', 'Unlimited Orders', 'Priority Support'],
    stripe_price_id: process.env.STRIPE_PRICE_PRO || '',
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 99,
    features: ['Everything in Pro', 'API Access', 'Dedicated Account Manager', 'Custom Integrations', 'White Label'],
    stripe_price_id: process.env.STRIPE_PRICE_ENTERPRISE || '',
  },
];

app.get('/api/plans', (req, res) => res.json(PLANS));

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (email, password, balance, role) VALUES (?, ?, 0, ?)').run(email, hash, isAdmin ? 'admin' : 'user');
    const userId = result.lastInsertRowid;
    if (isAdmin) ensureAdminSub(userId);
    else ensureTrialSub(userId);
    const sub = getSubscription(userId);
    const token = jwt.sign({ id: userId, email, role: isAdmin ? 'admin' : 'user' }, JWT_SECRET);
    res.json({ token, user: { email, balance: 0, role: isAdmin ? 'admin' : 'user', subscription: sub } });
  } catch {
    res.status(400).json({ error: 'Email already registered' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
  if (isAdmin && user.role !== 'admin') {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
    user.role = 'admin';
  }
  if (isAdmin) ensureAdminSub(user.id);
  else ensureTrialSub(user.id);
  const sub = getSubscription(user.id);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  res.json({ token, user: { email: user.email, balance: user.balance, role: user.role, subscription: sub } });
});

// ─── User ─────────────────────────────────────────────────────────────────────
app.get('/api/user/profile', authenticate, (req, res) => {
  const user = db.prepare('SELECT email, balance, role FROM users WHERE id = ?').get(req.user.id);
  const sub = getSubscription(req.user.id);
  res.json({ ...user, subscription: sub });
});

app.get('/api/subscription', authenticate, (req, res) => {
  res.json(getSubscription(req.user.id));
});

// ─── Services ────────────────────────────────────────────────────────────────
app.get('/api/services', authenticate, (req, res) => {
  const type = req.query.type || 'server';
  // Exclude cost_price from client response (internal margin data)
  const rows = db.prepare('SELECT id, name, price, category, delivery, type FROM services WHERE type = ?').all(type);
  res.json(rows);
});

// ─── IMEI Check ───────────────────────────────────────────────────────────────
const IMEI_CHECK_PRICE = 1.29;  // credit charge per lookup (brand + iCloud + SIM lock bundle)
const IMEI_CHECK_COST  = 0.065; // $0.02 brand(203) + $0.02 iCloud(3) + $0.025 SIM(8) = $0.065

app.get('/api/imei/check', authenticate, requireSub, async (req, res) => {
  const { imei } = req.query;
  if (!imei || !/^\d{15,16}$/.test(imei.replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Valid 15-digit IMEI required' });
  }

  const cleanImei = imei.replace(/\s/g, '');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  // Admin users get free checks; regular users pay 0.99
  if (user.role !== 'admin') {
    if (user.balance < IMEI_CHECK_PRICE) {
      return res.status(400).json({
        error: `Insufficient balance. IMEI Check costs $${IMEI_CHECK_PRICE.toFixed(2)}. Please add funds.`,
        balance: user.balance,
        required: IMEI_CHECK_PRICE,
      });
    }

    // Deduct balance and log the order atomically
    const checkService = db.prepare("SELECT * FROM services WHERE type = 'check' LIMIT 1").get();
    db.transaction(() => {
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(IMEI_CHECK_PRICE, user.id);
      db.prepare(
        'INSERT INTO orders (user_id, service_id, imei, status, profit_earned) VALUES (?, ?, ?, ?, ?)'
      ).run(user.id, checkService?.id || null, cleanImei, 'completed', IMEI_CHECK_PRICE - IMEI_CHECK_COST);
    })();
    io.emit('order_updated');
  }

  const result = await runIMEICheck(cleanImei);
  const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(user.id);
  res.json({ ...result, balance: updatedUser.balance, charged: user.role !== 'admin' ? IMEI_CHECK_PRICE : 0 });
});

// ─── SickW Individual Check (per-service, with profit) ───────────────────────
app.get('/api/sickw/check', authenticate, async (req, res) => {
  const { imei, service_id } = req.query;
  if (!imei || !/^\d{15,16}$/.test(imei.replace(/\s/g, '')))
    return res.status(400).json({ error: 'Valid 15-digit IMEI required' });
  if (!service_id)
    return res.status(400).json({ error: 'service_id required' });

  const cleanImei = imei.replace(/\s/g, '');
  const service = db.prepare("SELECT * FROM services WHERE id = ? AND type = 'check'").get(parseInt(service_id));
  if (!service) return res.status(404).json({ error: 'Check service not found' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (user.role !== 'admin') {
    if (user.balance < service.price)
      return res.status(400).json({
        error: `Insufficient balance. This check costs $${service.price.toFixed(2)}. Please add funds.`,
        balance: user.balance,
        required: service.price,
      });

    const profit = service.price - (service.cost_price || 0);
    db.transaction(() => {
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(service.price, user.id);
      db.prepare('INSERT INTO orders (user_id, service_id, imei, status, profit_earned) VALUES (?, ?, ?, ?, ?)')
        .run(user.id, service.id, cleanImei, 'completed', profit);
    })();
    io.emit('order_updated');
  }

  let result;
  try {
    if (!SICKW_API_KEY) return res.status(503).json({ error: 'SickW API not configured' });

    if (service.api_service_id === 'bundle') {
      // Full bundle — reuse existing logic
      result = await runIMEICheck(cleanImei);
    } else {
      const raw = await sickwCheck(cleanImei, service.api_service_id);
      if (raw.status !== 'success' && raw.status !== 'rejected')
        return res.status(400).json({ error: raw.result || 'SickW API error' });
      result = { success: true, provider: 'SICKW', service: service.name, result: raw.result };
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(user.id);
  res.json({ ...result, balance: updatedUser.balance, charged: user.role !== 'admin' ? service.price : 0 });
});

// ─── Orders ──────────────────────────────────────────────────────────────────
const ORDER_SELECT = `
  SELECT o.id, o.user_id, o.service_id, o.imei, o.status, o.date,
         o.external_order_id, o.api_status,
         s.name as service_name, s.price as service_price,
         s.category as service_category, s.type as service_type
  FROM orders o LEFT JOIN services s ON o.service_id = s.id
`;

app.get('/api/orders', authenticate, (req, res) => {
  const data = req.user.role === 'admin'
    ? db.prepare(ORDER_SELECT + ' ORDER BY o.date DESC').all()
    : db.prepare(ORDER_SELECT + ' WHERE o.user_id = ? ORDER BY o.date DESC').all(req.user.id);
  res.json(data);
});

app.post('/api/orders', authenticate, requireSub, async (req, res) => {
  const { service_id, imei } = req.body;
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(service_id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  if (user.balance < service.price) return res.status(400).json({ error: 'Insufficient balance. Please add funds.' });

  let orderId;
  try {
    const profit = service.price - (service.cost_price || 0);
    db.transaction(() => {
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(service.price, user.id);
      const result = db.prepare(
        'INSERT INTO orders (user_id, service_id, imei, status, profit_earned) VALUES (?, ?, ?, ?, ?)'
      ).run(user.id, service.id, imei, 'in process', profit);
      orderId = result.lastInsertRowid;
    })();
  } catch {
    return res.status(500).json({ error: 'Order failed — database error' });
  }

  const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(user.id);
  io.emit('order_updated');

  // Submit to provider (GsmServer → Elbroos → UnlockBase) — non-blocking
  if (imei) {
    if (service.gsmserver_service_id && GSMSERVER_USERNAME && GSMSERVER_API_KEY) {
      submitToGsmServer(service.gsmserver_service_id, imei).then((r) => {
        if (r.success) {
          db.prepare("UPDATE orders SET external_order_id=?, api_status=?, provider='gsmserver' WHERE id=?")
            .run(r.orderId, r.apiStatus, orderId);
          console.log(`[GsmServer] Order #${orderId} submitted → ID: ${r.orderId}`);
        } else {
          console.warn(`[GsmServer] Order #${orderId} failed: ${r.reason}`);
        }
        io.emit('order_updated');
      }).catch(err => console.error('[GsmServer] Async error:', err.message));
    } else if (service.elbroos_service_id) {
      submitToElbroos(service.elbroos_service_id, imei).then((r) => {
        if (r.success) {
          db.prepare("UPDATE orders SET external_order_id=?, api_status=?, provider='elbroos' WHERE id=?")
            .run(r.orderId, r.apiStatus, orderId);
          console.log(`[Elbroos] Order #${orderId} submitted → ID: ${r.orderId}`);
        } else {
          console.warn(`[Elbroos] Order #${orderId} failed: ${r.reason}`);
        }
        io.emit('order_updated');
      }).catch(err => console.error('[Elbroos] Async error:', err.message));
    } else if (service.api_service_id) {
      submitToUnlockBase(service.api_service_id, imei).then((r) => {
        if (r.success) {
          db.prepare("UPDATE orders SET external_order_id=?, api_status=?, provider='unlockbase' WHERE id=?")
            .run(r.orderId, r.apiStatus, orderId);
          console.log(`[UnlockBase] Order #${orderId} submitted → ID: ${r.orderId}`);
        } else {
          console.warn(`[UnlockBase] Order #${orderId} failed: ${r.reason}`);
        }
        io.emit('order_updated');
      }).catch(err => console.error('[UnlockBase] Async error:', err.message));
    }
  }

  res.json({
    message: 'Order placed successfully',
    balance: updatedUser.balance,
    order_id: orderId,
    api_connected: !!(service.gsmserver_service_id || service.elbroos_service_id || service.api_service_id),
  });
});

app.patch('/api/orders/:id/status', authenticate, requireAdmin, (req, res) => {
  const { status } = req.body;
  const valid = ['in process', 'completed', 'failed', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, parseInt(req.params.id));
  io.emit('order_updated');
  res.json({ success: true });
});

// ─── Admin ────────────────────────────────────────────────────────────────────
app.get('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.balance, u.role,
           s.plan, s.status as sub_status, s.trial_ends_at, s.current_period_end
    FROM users u LEFT JOIN subscriptions s ON u.id = s.user_id
    ORDER BY u.id DESC
  `).all();
  res.json(users);
});

app.patch('/api/admin/users/:id/balance', authenticate, requireAdmin, (req, res) => {
  const { amount } = req.body;
  if (typeof amount !== 'number') return res.status(400).json({ error: 'Amount must be a number' });
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, parseInt(req.params.id));
  io.emit('order_updated');
  res.json({ success: true });
});

app.patch('/api/admin/users/:id/subscription', authenticate, requireAdmin, (req, res) => {
  const { plan, status, days } = req.body;
  const userId = parseInt(req.params.id);
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + (parseInt(days) || 30));
  const existing = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  if (existing) {
    db.prepare('UPDATE subscriptions SET plan = ?, status = ?, current_period_end = ? WHERE user_id = ?')
      .run(plan || existing.plan, status || 'active', periodEnd.toISOString(), userId);
  } else {
    db.prepare('INSERT INTO subscriptions (user_id, plan, status, current_period_end) VALUES (?, ?, ?, ?)')
      .run(userId, plan || 'starter', status || 'active', periodEnd.toISOString());
  }
  io.emit('subscription_updated');
  res.json({ success: true });
});

// Admin: profit & revenue stats
// Admin: analytics summary — revenue, profit, orders, users, trends
app.get('/api/admin/stats', authenticate, requireAdmin, (req, res) => {
  const orderStats = db.prepare(`
    SELECT
      COUNT(*)                                                 AS total_orders,
      SUM(CASE WHEN o.status = 'completed'  THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN o.status = 'in process' THEN 1 ELSE 0 END) AS in_process,
      SUM(CASE WHEN o.status = 'failed'     THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN o.status = 'cancelled'  THEN 1 ELSE 0 END) AS cancelled,
      COALESCE(SUM(s.price),      0)                           AS total_revenue,
      COALESCE(SUM(s.cost_price), 0)                           AS total_cost
    FROM orders o
    LEFT JOIN services s ON s.id = o.service_id
    WHERE o.user_id IS NOT NULL
  `).get();

  const userCount      = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role != 'admin'").get().c;
  const totalBalance   = db.prepare('SELECT COALESCE(SUM(balance),0) AS t FROM users').get().t;
  const pendingTopups  = db.prepare("SELECT COUNT(*) AS c FROM topup_requests WHERE status = 'pending'").get().c;
  const totalDeposited = db.prepare("SELECT COALESCE(SUM(amount),0) AS t FROM topup_requests WHERE status = 'approved'").get().t;

  const byCategory = db.prepare(`
    SELECT s.category, COUNT(*) AS cnt, COALESCE(SUM(s.price),0) AS rev
    FROM orders o JOIN services s ON s.id = o.service_id
    WHERE o.status = 'completed'
    GROUP BY s.category ORDER BY rev DESC LIMIT 6
  `).all();

  const daily = db.prepare(`
    SELECT DATE(o.date) AS day, COUNT(*) AS orders, COALESCE(SUM(s.price),0) AS revenue
    FROM orders o JOIN services s ON s.id = o.service_id
    WHERE o.date >= DATE('now', '-6 days')
    GROUP BY DATE(o.date) ORDER BY day
  `).all();

  const revenue   = parseFloat(orderStats.total_revenue);
  const cost      = parseFloat(orderStats.total_cost);

  res.json({
    total_orders:    orderStats.total_orders,
    completed:       orderStats.completed,
    in_process:      orderStats.in_process,
    failed:          orderStats.failed,
    cancelled:       orderStats.cancelled,
    user_count:      userCount,
    total_user_balance: parseFloat(totalBalance),
    pending_topups:  pendingTopups,
    total_deposited: parseFloat(totalDeposited),
    total_revenue:   revenue,
    total_cost:      cost,
    total_profit:    parseFloat((revenue - cost).toFixed(2)),
    by_category:     byCategory,
    daily_revenue:   daily,
  });
});

// Admin: get service catalogue with cost_price (profit margins visible to admin only)
app.get('/api/admin/services', authenticate, requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM services ORDER BY type, id').all());
});

// Admin: update a service's api_service_id (link to UnlockBase reseller panel)
app.patch('/api/admin/services/:id', authenticate, requireAdmin, (req, res) => {
  const { api_service_id, price, cost_price } = req.body;
  const svcId = parseInt(req.params.id);
  if (api_service_id !== undefined) {
    db.prepare('UPDATE services SET api_service_id = ? WHERE id = ?').run(api_service_id || null, svcId);
  }
  if (typeof price === 'number') {
    db.prepare('UPDATE services SET price = ? WHERE id = ?').run(price, svcId);
  }
  if (typeof cost_price === 'number') {
    db.prepare('UPDATE services SET cost_price = ? WHERE id = ?').run(cost_price, svcId);
  }
  res.json({ success: true });
});

// ─── Stripe Checkout ─────────────────────────────────────────────────────────
app.post('/api/subscription/checkout', authenticate, async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured. Contact admin to activate your subscription.' });
  const { plan_id } = req.body;
  const plan = PLANS.find(p => p.id === plan_id);
  if (!plan?.stripe_price_id) return res.status(400).json({ error: 'Plan not available for online purchase' });
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${APP_URL}?subscribed=1`,
      cancel_url: `${APP_URL}`,
      metadata: { user_id: String(req.user.id), plan_id },
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Stripe Webhook ───────────────────────────────────────────────────────────
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }

  const obj = event.data.object;
  if (event.type === 'checkout.session.completed') {
    const userId = parseInt(obj.metadata?.user_id || '0');
    const planId = obj.metadata?.plan_id || 'starter';
    if (userId) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const ex = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
      if (ex) {
        db.prepare("UPDATE subscriptions SET plan=?, status='active', stripe_sub_id=?, stripe_customer_id=?, current_period_end=? WHERE user_id=?")
          .run(planId, obj.subscription, obj.customer, periodEnd.toISOString(), userId);
      } else {
        db.prepare("INSERT INTO subscriptions (user_id,plan,status,stripe_sub_id,stripe_customer_id,current_period_end) VALUES (?,?,'active',?,?,?)")
          .run(userId, planId, obj.subscription, obj.customer, periodEnd.toISOString());
      }
      io.emit('subscription_updated');
    }
  } else if (event.type === 'customer.subscription.deleted') {
    db.prepare("UPDATE subscriptions SET status='expired' WHERE stripe_customer_id=?").run(obj.customer);
    io.emit('subscription_updated');
  } else if (event.type === 'invoice.paid') {
    const periodEnd = new Date(obj.lines?.data?.[0]?.period?.end * 1000 || Date.now() + 30*86400*1000);
    db.prepare("UPDATE subscriptions SET status='active', current_period_end=? WHERE stripe_customer_id=?")
      .run(periodEnd.toISOString(), obj.customer);
    io.emit('subscription_updated');
  } else if (event.type === 'invoice.payment_failed') {
    db.prepare("UPDATE subscriptions SET status='past_due' WHERE stripe_customer_id=?").run(obj.customer);
    io.emit('subscription_updated');
  }

  res.json({ received: true });
});

// ─── Health check ─────────────────────────────────────────────────────────────
// ─── UnlockBase Webhook (callback when order status changes) ─────────────────
app.post('/api/webhook/unlockbase', (req, res) => {
  const { order_id, status, code, unlock_code } = req.body;
  if (!order_id) return res.status(400).json({ error: 'Missing order_id' });

  const order = db.prepare("SELECT * FROM orders WHERE external_order_id = ?").get(String(order_id));
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const mapped = mapUnlockStatus(status);
  const unlockCode = code || unlock_code || null;

  db.prepare('UPDATE orders SET status = ?, api_status = ?, result = ? WHERE id = ?')
    .run(mapped || 'in process', status, unlockCode ? JSON.stringify({ code: unlockCode }) : null, order.id);

  io.emit('order_updated');
  console.log(`[Webhook] Order #${order.id} (ext: ${order_id}) → ${mapped} | Code: ${unlockCode || 'none'}`);
  res.json({ ok: true });
});

// Admin: manual retry — resubmit a failed/stuck order to UnlockBase
app.post('/api/admin/orders/:id/retry', authenticate, requireAdmin, async (req, res) => {
  const order = db.prepare(`
    SELECT o.*, s.api_service_id FROM orders o
    LEFT JOIN services s ON o.service_id = s.id
    WHERE o.id = ?
  `).get(parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!order.api_service_id) return res.status(400).json({ error: 'Service has no API ID mapped' });
  if (!order.imei) return res.status(400).json({ error: 'No IMEI on this order' });

  const apiResult = await submitToUnlockBase(order.api_service_id, order.imei);
  if (apiResult.success) {
    db.prepare('UPDATE orders SET external_order_id = ?, api_status = ?, status = ? WHERE id = ?')
      .run(apiResult.orderId, apiResult.apiStatus, 'in process', order.id);
    io.emit('order_updated');
    res.json({ ok: true, external_id: apiResult.orderId });
  } else {
    res.status(400).json({ error: apiResult.reason });
  }
});

// Admin: map api_service_id to a service (bulk update for UnlockBase/FRP mapping)
app.post('/api/admin/services/map', authenticate, requireAdmin, (req, res) => {
  const { mappings } = req.body; // [{ id, api_service_id }]
  if (!Array.isArray(mappings)) return res.status(400).json({ error: 'mappings array required' });
  const update = db.prepare('UPDATE services SET api_service_id = ? WHERE id = ?');
  const doAll = db.transaction(() => mappings.forEach(m => update.run(m.api_service_id || null, m.id)));
  doAll();
  res.json({ ok: true, updated: mappings.length });
});

// Admin: map Elbroos service IDs (bulk)
app.post('/api/admin/services/map-elbroos', authenticate, requireAdmin, (req, res) => {
  const { mappings } = req.body; // [{ id, elbroos_service_id }]
  if (!Array.isArray(mappings)) return res.status(400).json({ error: 'mappings array required' });
  const update = db.prepare('UPDATE services SET elbroos_service_id = ? WHERE id = ?');
  const doAll = db.transaction(() => mappings.forEach(m => update.run(m.elbroos_service_id || null, m.id)));
  doAll();
  res.json({ ok: true, updated: mappings.length });
});

// Admin: map GsmServer service IDs (bulk)
app.post('/api/admin/services/map-gsmserver', authenticate, requireAdmin, (req, res) => {
  const { mappings } = req.body; // [{ id, gsmserver_service_id }]
  if (!Array.isArray(mappings)) return res.status(400).json({ error: 'mappings array required' });
  const update = db.prepare('UPDATE services SET gsmserver_service_id = ? WHERE id = ?');
  const doAll = db.transaction(() => mappings.forEach(m => update.run(m.gsmserver_service_id || null, m.id)));
  doAll();
  res.json({ ok: true, updated: mappings.length });
});

// Admin: GsmServer account balance
app.get('/api/admin/gsmserver/balance', authenticate, requireAdmin, async (req, res) => {
  const data = await getGsmServerBalance();
  if (!data) return res.status(502).json({ error: 'GsmServer request failed or not configured' });
  res.json(data);
});

// Admin: GsmServer service list
app.get('/api/admin/gsmserver/services', authenticate, requireAdmin, async (req, res) => {
  const r = await gsmServerRequest({ action: 'getservices' });
  if (!r.ok) return res.status(502).json({ error: r.error });
  res.json(r.data);
});

// Admin: Sync GsmServer services — update cost prices + gsmserver_service_id
app.post('/api/admin/gsmserver/sync', authenticate, requireAdmin, async (req, res) => {
  const r = await gsmServerRequest({ action: 'getservices' });
  if (!r.ok) return res.status(502).json({ error: r.error });

  const services = Array.isArray(r.data) ? r.data : (r.data?.services || Object.values(r.data || {}));
  if (!services.length) return res.status(502).json({ error: 'GsmServer returned empty service list' });

  const marginPct = parseFloat(getSetting('global_margin_pct', '0')) || 0;
  const updateCost  = db.prepare('UPDATE services SET cost_price=?, gsmserver_service_id=? WHERE id=?');
  const updatePrice = db.prepare('UPDATE services SET cost_price=?, gsmserver_service_id=?, price=? WHERE id=?');
  const allServices = db.prepare('SELECT id, name, cost_price, type FROM services').all();

  let matched = 0, updated = 0;
  for (const gsm of services) {
    const gsmName  = (gsm.name || gsm.service_name || gsm.title || '').toLowerCase().trim();
    const gsmPrice = parseFloat(gsm.price || gsm.cost || gsm.rate || 0);
    const gsmId    = String(gsm.service_id || gsm.id || '');
    if (!gsmName || !gsmId) continue;

    // fuzzy match: GsmServer name contains our name or vice versa
    const local = allServices.find(s => {
      const n = s.name.toLowerCase();
      return n.includes(gsmName) || gsmName.includes(n) ||
             n.split(' ').filter(w => w.length > 4).every(w => gsmName.includes(w));
    });
    if (!local) continue;
    matched++;

    if (gsmPrice > 0 && marginPct > 0) {
      const retail = applyMargin(gsmPrice, marginPct, local.type);
      updatePrice.run(gsmPrice, gsmId, retail, local.id);
    } else if (gsmPrice > 0) {
      updateCost.run(gsmPrice, gsmId, local.id);
    } else {
      db.prepare('UPDATE services SET gsmserver_service_id=? WHERE id=?').run(gsmId, local.id);
    }
    updated++;
  }

  res.json({ ok: true, gsmserver_services: services.length, matched, updated, margin_applied: marginPct > 0 });
});

// ─── Global Profit Margin ─────────────────────────────────────────────────────

// GET current margin setting
app.get('/api/admin/settings/margin', authenticate, requireAdmin, (req, res) => {
  const margin = parseFloat(getSetting('global_margin_pct', '0')) || 0;
  res.json({ global_margin_pct: margin });
});

// SET margin and recalculate all retail prices
app.post('/api/admin/settings/margin', authenticate, requireAdmin, (req, res) => {
  const { margin_pct } = req.body;
  const pct = parseFloat(margin_pct);
  if (isNaN(pct) || pct < 0 || pct > 10000) return res.status(400).json({ error: 'margin_pct must be 0–10000' });

  setSetting('global_margin_pct', pct);

  // Recalculate all retail prices from cost_price
  const services = db.prepare('SELECT id, cost_price, type FROM services WHERE cost_price > 0').all();
  const update   = db.prepare('UPDATE services SET price=? WHERE id=?');
  const applyAll = db.transaction(() => {
    for (const s of services) {
      const retail = applyMargin(s.cost_price, pct, s.type);
      if (retail) update.run(retail, s.id);
    }
  });
  applyAll();

  res.json({ ok: true, global_margin_pct: pct, services_repriced: services.length });
});

// User: get result/unlock code for their order
app.get('/api/orders/:id/result', authenticate, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(parseInt(req.params.id), req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const result = order.result ? JSON.parse(order.result) : null;
  res.json({ status: order.status, api_status: order.api_status, result });
});

// ─── SickW Service Sync ───────────────────────────────────────────────────────
// Sell price tiers based on real SickW costs (verified May 2026)
// iCloud/SIM/Brand checks cost $0.02-0.025 → sell $0.49
// Apple basic/Verizon/T-Mobile cost $0.05-0.06 → sell $0.79
// Samsung/Motorola/Huawei info cost $0.08-0.12 → sell $1.29
// Cricket/Pixel/Blacklist cost $0.12-0.25 → sell $1.99
function sickwMarkup(cost) {
  const c = parseFloat(cost) || 0;
  if (c === 0)    return 0.49;
  if (c < 0.03)  return 0.49;   // iCloud, SIM lock, brand, serial info
  if (c < 0.06)  return 0.79;   // Apple basic, Verizon, T-Mobile, ZTE
  if (c < 0.12)  return 1.29;   // Samsung, Motorola, Huawei, Japan BL
  if (c < 0.25)  return 1.99;   // Cricket, Pixel, WW Blacklist, MacBook
  if (c < 0.50)  return 3.49;
  if (c < 1.00)  return 5.99;
  if (c < 2.00)  return 9.99;
  if (c < 5.00)  return Math.ceil(c * 4 * 2) / 2;   // ~4x
  if (c < 20.00) return Math.ceil(c * 3 * 2) / 2;   // ~3x
  return Math.ceil(c * 2.5 * 2) / 2;                // ~2.5x for premium
}

// Fetch all SickW services and sync into DB
app.get('/api/admin/sickw/services', authenticate, requireAdmin, async (req, res) => {
  if (!SICKW_API_KEY) return res.status(503).json({ error: 'SICKW_API_KEY not set' });
  try {
    const { data } = await axios.get('https://sickw.com/api.php', {
      params: { format: 'json', key: SICKW_API_KEY, action: 'services' },
      timeout: 15000,
    });
    const list = data['Service List'] || [];
    // Add sell price preview
    const enriched = list.map(s => ({
      service_id:  s.service,
      name:        s.name.replace(/&#x21C4;/g, '⇄').replace(/&amp;/g, '&').replace(/ /g, ' ').trim(),
      cost:        parseFloat(s.price) || 0,
      sell_price:  sickwMarkup(parseFloat(s.price) || 0),
    }));
    res.json({ total: enriched.length, services: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/sickw/sync', authenticate, requireAdmin, async (req, res) => {
  if (!SICKW_API_KEY) return res.status(503).json({ error: 'SICKW_API_KEY not set' });
  const { service_ids } = req.body; // optional: sync only selected IDs

  try {
    const { data } = await axios.get('https://sickw.com/api.php', {
      params: { format: 'json', key: SICKW_API_KEY, action: 'services' },
      timeout: 15000,
    });
    const list = (data['Service List'] || []).filter(s =>
      !service_ids || service_ids.includes(String(s.service))
    );

    try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_services_name ON services(name)'); } catch (_) {}

    const upsert = db.prepare(`
      INSERT INTO services (name, price, cost_price, category, delivery, type, api_service_id)
      VALUES (?, ?, ?, ?, ?, 'check', ?)
      ON CONFLICT(name) DO UPDATE SET
        price          = excluded.price,
        cost_price     = excluded.cost_price,
        api_service_id = excluded.api_service_id
    `);

    let synced = 0;
    const doSync = db.transaction(() => {
      for (const s of list) {
        const name      = `[SickW] ${s.name.replace(/&#x21C4;/g, '⇄').replace(/&amp;/g, '&').replace(/ /g, ' ').trim()}`;
        const cost      = parseFloat(s.price) || 0;
        const sellPrice = sickwMarkup(cost);
        const delivery  = cost === 0 ? 'Instant' : 'Instant';
        upsert.run(name, sellPrice, cost, 'SickW Check', delivery, String(s.service));
        synced++;
      }
    });
    doSync();

    res.json({ ok: true, synced, message: `${synced} SickW services synced successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/sickw/balance', authenticate, requireAdmin, async (req, res) => {
  if (!SICKW_API_KEY) return res.status(503).json({ error: 'SICKW_API_KEY not set' });
  try {
    const { data } = await axios.get('https://sickw.com/api.php', {
      params: { format: 'json', key: SICKW_API_KEY, action: 'balance' },
      timeout: 10000,
    });
    res.json({ balance: data.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Payoneer Top-Up ─────────────────────────────────────────────────────────
app.get('/api/topup/info', authenticate, (req, res) => {
  res.json({ email: PAYONEER_EMAIL, link: PAYONEER_LINK });
});

app.post('/api/topup/request', authenticate, (req, res) => {
  const { amount, reference } = req.body;
  if (!amount || isNaN(amount) || amount < 1)
    return res.status(400).json({ error: 'Minimum top-up is $1.00' });
  if (!reference || reference.trim().length < 3)
    return res.status(400).json({ error: 'Payment reference is required' });

  // Prevent duplicate reference submissions
  const existing = db.prepare("SELECT id FROM topup_requests WHERE reference = ? AND status = 'pending'").get(reference.trim());
  if (existing) return res.status(400).json({ error: 'This reference was already submitted' });

  db.prepare('INSERT INTO topup_requests (user_id, amount, reference, method) VALUES (?, ?, ?, ?)').run(
    req.user.id, parseFloat(amount), reference.trim(), 'payoneer'
  );
  res.json({ ok: true, message: 'Top-up request submitted. Admin will review and credit your account.' });
});

app.get('/api/topup/my', authenticate, (req, res) => {
  const rows = db.prepare('SELECT * FROM topup_requests WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(rows);
});

// Admin: view all top-up requests
app.get('/api/admin/topup-requests', authenticate, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, u.email as user_email
    FROM topup_requests t JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `).all();
  res.json(rows);
});

// Admin: approve
app.post('/api/admin/topup-requests/:id/approve', authenticate, requireAdmin, (req, res) => {
  const req_row = db.prepare('SELECT * FROM topup_requests WHERE id = ?').get(parseInt(req.params.id));
  if (!req_row) return res.status(404).json({ error: 'Request not found' });
  if (req_row.status !== 'pending') return res.status(400).json({ error: `Already ${req_row.status}` });

  db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(req_row.amount, req_row.user_id);
    db.prepare("UPDATE topup_requests SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?").run(req_row.id);
  })();
  io.emit('balance_updated', { user_id: req_row.user_id });
  res.json({ ok: true, message: `$${req_row.amount.toFixed(2)} credited to user.` });
});

// Admin: reject
app.post('/api/admin/topup-requests/:id/reject', authenticate, requireAdmin, (req, res) => {
  const { note } = req.body;
  const req_row = db.prepare('SELECT * FROM topup_requests WHERE id = ?').get(parseInt(req.params.id));
  if (!req_row) return res.status(404).json({ error: 'Request not found' });
  if (req_row.status !== 'pending') return res.status(400).json({ error: `Already ${req_row.status}` });

  db.prepare("UPDATE topup_requests SET status = 'rejected', note = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?").run(note || null, req_row.id);
  res.json({ ok: true });
});

// ─── WiPay Caribbean — Credit/Debit Card Payments ────────────────────────────

// Step 1: initiate — create WiPay transaction, return payment URL
app.post('/api/payment/wipay/initiate', authenticate, async (req, res) => {
  if (!WIPAY_ACCOUNT_NUMBER || !WIPAY_API_KEY)
    return res.status(503).json({ error: 'Card payments not configured. Contact admin.' });

  const { amount } = req.body;
  if (!amount || isNaN(amount) || parseFloat(amount) < 1)
    return res.status(400).json({ error: 'Minimum top-up is $1.00' });

  const orderId  = `SJ-${req.user.id}-${Date.now()}`;
  const total    = parseFloat(amount).toFixed(2);
  const returnUrl = `${APP_URL}?payment=success&order=${orderId}`;
  const callbackUrl = `${process.env.BACKEND_URL || APP_URL}/api/payment/wipay/callback`;

  try {
    const params = new URLSearchParams({
      account_number: WIPAY_ACCOUNT_NUMBER,
      avs:            '0',
      data_reference: orderId,
      environment:    WIPAY_ENVIRONMENT,
      fee_structure:  WIPAY_FEE_STRUCTURE,
      method:         'credit_card',
      order_id:       orderId,
      redirect_url:   returnUrl,
      origin:         APP_URL,
      response_url:   callbackUrl,
      total,
      currency:       WIPAY_CURRENCY,
    });

    const { data } = await axios.post(
      'https://wipayfinancial.com/v1/transactions/create',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Bearer ${WIPAY_API_KEY}` }, timeout: 15000 }
    );

    if (!data || !data.url)
      return res.status(502).json({ error: 'WiPay did not return a payment URL', detail: data });

    // Store pending topup
    db.prepare(
      "INSERT INTO topup_requests (user_id, amount, reference, method, wipay_order_id) VALUES (?, ?, ?, 'wipay', ?)"
    ).run(req.user.id, parseFloat(total), orderId, orderId);

    res.json({ payment_url: data.url, order_id: orderId });
  } catch (err) {
    console.error('[WiPay] initiate error:', err.message);
    res.status(502).json({ error: 'Failed to connect to WiPay. Try again or use Payoneer.' });
  }
});

// Step 2: callback — WiPay POSTs here when payment completes (server-to-server)
app.post('/api/payment/wipay/callback', express.urlencoded({ extended: true }), (req, res) => {
  const { status, transaction_id, order_id, total } = req.body;
  console.log('[WiPay] Callback:', req.body);

  if (!order_id) return res.sendStatus(400);

  const row = db.prepare("SELECT * FROM topup_requests WHERE wipay_order_id = ? AND method = 'wipay'").get(order_id);
  if (!row) return res.sendStatus(404);

  if (status === 'success' && row.status === 'pending') {
    db.transaction(() => {
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(row.amount, row.user_id);
      db.prepare(
        "UPDATE topup_requests SET status='approved', wipay_tx_id=?, reviewed_at=CURRENT_TIMESTAMP WHERE id=?"
      ).run(transaction_id || null, row.id);
    })();
    io.emit('balance_updated', { user_id: row.user_id });
    console.log(`[WiPay] $${row.amount} credited to user ${row.user_id} — tx: ${transaction_id}`);
  } else if (status !== 'success' && row.status === 'pending') {
    db.prepare("UPDATE topup_requests SET status='rejected', note=? WHERE id=?").run(`WiPay: ${status}`, row.id);
  }

  res.sendStatus(200);
});

// Check wipay payment status (user polls after returning from WiPay)
app.get('/api/payment/wipay/status', authenticate, (req, res) => {
  const { order_id } = req.query;
  const row = db.prepare("SELECT status, amount FROM topup_requests WHERE wipay_order_id=? AND user_id=?").get(order_id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Order not found' });
  const updatedUser = db.prepare('SELECT balance FROM users WHERE id=?').get(req.user.id);
  res.json({ status: row.status, amount: row.amount, balance: updatedUser.balance });
});

// ─── Elbroos GSM API Integration ─────────────────────────────────────────────
// API format: POST JSON with username + apiaccesskey + requestformat + action
async function elbroosRequest(action, extraFields = {}) {
  if (!ELBROOS_USERNAME) return { success: false, error: 'ELBROOS_USERNAME not configured' };
  try {
    const { data } = await axios.post(
      `${ELBROOS_BASE_URL}/${action}`,
      { username: ELBROOS_USERNAME, apiaccesskey: ELBROOS_API_KEY, requestformat: 'JSON', action, ...extraFields },
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: 20000 }
    );
    return { success: true, data };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error(`[Elbroos] ${action} error:`, msg);
    return { success: false, error: msg };
  }
}

// Admin: fetch Elbroos account balance / info
app.get('/api/admin/elbroos/balance', authenticate, requireAdmin, async (req, res) => {
  const result = await elbroosRequest('accountinfo');
  if (!result.success) return res.status(502).json({ error: result.error });
  res.json(result.data);
});

// Admin: fetch all Elbroos services
app.get('/api/admin/elbroos/services', authenticate, requireAdmin, async (req, res) => {
  const result = await elbroosRequest('imeiservicelist');
  if (!result.success) return res.status(502).json({ error: result.error });
  res.json(result.data);
});

// Place order via Elbroos (called internally when service has elbroos_service_id)
async function submitToElbroos(serviceId, imei) {
  if (!ELBROOS_USERNAME) return { success: false, reason: 'Elbroos not configured — set ELBROOS_USERNAME' };
  const params = `<PARAMETERS><ID>${serviceId}</ID><SERVER>true</SERVER><QUANTITY>1</QUANTITY><TargetLogin>${ELBROOS_USERNAME}</TargetLogin></PARAMETERS>`;
  const result = await elbroosRequest('placeimeiorder', { parameters: params });
  if (!result.success) return { success: false, reason: result.error };
  const d = result.data;
  if (d?.OrderID) return { success: true, orderId: String(d.OrderID), apiStatus: d.Status || 'in process' };
  if (d?.error)   return { success: false, reason: d.error };
  return { success: false, reason: 'Unexpected Elbroos response', raw: d };
}

// Check Elbroos order status
async function checkElbroosOrder(externalOrderId) {
  if (!ELBROOS_USERNAME || !externalOrderId) return null;
  const params = `<PARAMETERS><ID>${externalOrderId}</ID></PARAMETERS>`;
  const result = await elbroosRequest('getimeiorder', { parameters: params });
  return result.success ? result.data : null;
}

// Admin: manual check on an Elbroos order
app.get('/api/admin/elbroos/order/:orderId', authenticate, requireAdmin, async (req, res) => {
  const data = await checkElbroosOrder(req.params.orderId);
  if (!data) return res.status(502).json({ error: 'Could not fetch order from Elbroos' });
  res.json(data);
});

// Admin: UnlockBase balance
app.get('/api/admin/unlockbase/balance', authenticate, requireAdmin, async (req, res) => {
  const bal = await getUnlockBaseBalance();
  if (bal === null) return res.status(502).json({ error: 'Could not fetch UnlockBase balance — check API key and IP whitelist' });
  res.json({ balance: bal, currency: 'USD' });
});

// Admin: UnlockBase services list
app.get('/api/admin/unlockbase/services', authenticate, requireAdmin, async (req, res) => {
  const r = await unlockBaseRequest({ type: 'services' });
  if (!r.ok) return res.status(502).json({ error: r.error });
  res.json({ raw: r.raw });
});

// Admin: show this server's outbound IP (needed for UnlockBase IP whitelist)
app.get('/api/admin/server-ip', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data } = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
    res.json({ ip: data.ip, note: 'Add this IP to your UnlockBase reseller API whitelist' });
  } catch {
    res.status(502).json({ error: 'Could not determine outbound IP' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '4.7',
    unlockApi:    !!UNLOCK_API_KEY,
    sickwApi:     !!SICKW_API_KEY,
    imeiCheckApi: !!IMEI_CHECK_API_KEY,
    imeiMode:     SICKW_API_KEY ? 'live-sickw' : IMEI_CHECK_API_KEY ? 'live-imeicheck' : 'demo',
    stripe:       !!stripe,
    wipay:        !!WIPAY_ACCOUNT_NUMBER,
    elbroos:      !!(ELBROOS_USERNAME && ELBROOS_API_KEY),
    gsmserver:    !!(GSMSERVER_USERNAME && GSMSERVER_API_KEY),
    global_margin: parseFloat(getSetting('global_margin_pct', '0')) || 0,
    services: db.prepare('SELECT count(*) as c FROM services').get().c,
  });
});

// ─── Public API (no auth required — website/guest) ───────────────────────────

// GET /api/public/services — full service list for public website
app.get('/api/public/services', (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, category, price, delivery, type
    FROM   services
    ORDER  BY category, name
  `).all();
  res.json(rows);
});

// POST /api/public/order — guest order submission from public website
app.post('/api/public/order', (req, res) => {
  const { service_id, imei, email, notes } = req.body || {};
  if (!service_id) return res.status(400).json({ error: 'service_id is required' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email is required' });

  const svc = db.prepare('SELECT * FROM services WHERE id = ?').get(service_id);
  if (!svc) return res.status(404).json({ error: 'Service not found' });

  const needsIMEI = ['imei', 'check'].includes(svc.type);
  if (needsIMEI && (!imei || String(imei).replace(/\D/g,'').length !== 15))
    return res.status(400).json({ error: 'IMEI must be 15 digits for this service' });

  const orderId = 'ORD-' + Date.now();
  const cleanIMEI = needsIMEI ? String(imei).replace(/\D/g,'') : '';

  try {
    db.prepare(`
      INSERT INTO orders (order_id, service_id, imei, email, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).run(orderId, service_id, cleanIMEI, email.trim().toLowerCase(), notes || '');

    // Notify admin dashboard via socket
    io.emit('new_order', { order_id: orderId, service: svc.name, email: email.trim() });

    res.json({
      order_id: orderId,
      service:  svc.name,
      price:    svc.price,
      delivery: svc.delivery,
      status:   'pending',
    });
  } catch (err) {
    console.error('Public order error:', err.message);
    res.status(500).json({ error: 'Failed to place order. Please try again.' });
  }
});

// GET /api/public/track/:orderId — public order status lookup
app.get('/api/public/track/:orderId', (req, res) => {
  const row = db.prepare(`
    SELECT o.order_id, o.status, o.imei, o.email, o.notes, o.result,
           o.created_at, s.name AS service, s.price, s.delivery
    FROM   orders o
    LEFT JOIN services s ON s.id = o.service_id
    WHERE  o.order_id = ?
  `).get(req.params.orderId);

  if (!row) return res.status(404).json({ error: 'Order not found' });

  // Normalise legacy status values
  const statusMap = {
    'in process': 'processing',
    'completed':  'completed',
    'complete':   'completed',
    'failed':     'failed',
    'cancelled':  'cancelled',
    'canceled':   'cancelled',
    'pending':    'pending',
  };
  const status = statusMap[String(row.status).toLowerCase()] || row.status;

  res.json({
    order_id:   row.order_id,
    service:    row.service,
    price:      row.price,
    delivery:   row.delivery,
    status,
    notes:      row.notes,
    result:     row.result,
    created_at: row.created_at,
  });
});

// POST /api/public/contact — contact form submission
// ─── Newsletter ───────────────────────────────────────────────────────────────
app.post('/api/newsletter/subscribe', (req, res) => {
  const { email, source } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Valid email required' });
  try {
    db.prepare('INSERT INTO newsletter_subscribers (email, source) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET subscribed = 1')
      .run(email.toLowerCase().trim(), source || 'website');
    res.json({ ok: true, message: 'Subscribed! Thank you for joining.' });
  } catch {
    res.status(500).json({ error: 'Subscription failed' });
  }
});

app.post('/api/newsletter/unsubscribe', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  db.prepare('UPDATE newsletter_subscribers SET subscribed = 0 WHERE email = ?').run(email.toLowerCase().trim());
  res.json({ ok: true });
});

app.get('/api/admin/newsletter', authenticate, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC').all();
  res.json(rows);
});

app.get('/api/admin/newsletter/broadcasts', authenticate, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM newsletter_broadcasts ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/api/admin/newsletter/broadcast', authenticate, requireAdmin, async (req, res) => {
  const { subject, body } = req.body;
  if (!subject?.trim() || !body?.trim())
    return res.status(400).json({ error: 'Subject and body are required' });
  if (!resend)
    return res.status(503).json({ error: 'Email not configured. Add RESEND_API_KEY to .env' });

  const subscribers = db.prepare("SELECT email FROM newsletter_subscribers WHERE subscribed = 1").all();
  if (!subscribers.length)
    return res.status(400).json({ error: 'No active subscribers yet' });

  // Log broadcast
  const broadcastId = db.prepare('INSERT INTO newsletter_broadcasts (subject, body, status) VALUES (?, ?, ?)').run(subject.trim(), body.trim(), 'sending').lastInsertRowid;

  // Respond immediately — send in background
  res.json({ ok: true, total: subscribers.length, broadcast_id: broadcastId });

  // Send emails in background with small delay between each to avoid spam filters
  let sent = 0, failed = 0;
  const fromAddr = process.env.RESEND_FROM || 'S&J UNLOCK <onboarding@resend.dev>';
  const unsubUrl = `${process.env.APP_URL || 'http://localhost:3005'}/api/newsletter/unsubscribe`;

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#6366f1,#f97316);padding:2rem;text-align:center;">
        <h1 style="margin:0;font-size:1.5rem;color:#fff;">S&amp;J UNLOCK</h1>
        <p style="margin:0.5rem 0 0;color:rgba(255,255,255,0.85);font-size:0.9rem;">Professional Unlock &amp; IMEI Services</p>
      </div>
      <div style="padding:2rem;">
        ${body.replace(/\n/g, '<br>')}
      </div>
      <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.1);text-align:center;">
        <p style="color:#64748b;font-size:0.75rem;margin:0;">
          © 2026 S&amp;J UNLOCK Inc. &nbsp;·&nbsp;
          <a href="${unsubUrl}" style="color:#6366f1;">Unsubscribe</a>
        </p>
      </div>
    </div>
  `;

  for (const sub of subscribers) {
    try {
      await resend.emails.send({
        from: fromAddr,
        to: sub.email,
        subject: subject.trim(),
        html: htmlBody,
        text: body.trim(),
      });
      sent++;
    } catch (err) {
      console.error(`[Broadcast] Failed to send to ${sub.email}:`, err.message);
      failed++;
    }
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  db.prepare('UPDATE newsletter_broadcasts SET status = ?, sent_count = ?, fail_count = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('sent', sent, failed, broadcastId);
  console.log(`[Broadcast #${broadcastId}] Done — ${sent} sent, ${failed} failed`);
});

app.post('/api/public/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message are required' });
  // Log to console / emit to dashboard — integrate nodemailer or similar as needed
  console.log(`[CONTACT] From: ${name} <${email}> | Subject: ${subject || 'N/A'}\n${message}`);
  io.emit('contact_message', { name, email, subject, message, ts: new Date().toISOString() });
  res.json({ ok: true });
});

// ─── Serve website (public-facing) ───────────────────────────────────────────
const websiteDist = path.join(__dirname, '../website/dist');
app.use('/www', express.static(websiteDist));
app.get(/^\/www(\/.*)?$/, (req, res) => res.sendFile('index.html', { root: websiteDist }));

// ─── Serve admin frontend ─────────────────────────────────────────────────────
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get(/(.*)/, (req, res) => res.sendFile('index.html', { root: frontendDist }));

server.listen(PORT, () => console.log(`S&J UNLOCK Core V4.0 running on port ${PORT}`));
