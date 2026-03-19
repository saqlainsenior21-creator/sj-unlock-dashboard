const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PATCH"] }
});
const port = process.env.PORT || 3005;

const SERVICES = [
  { id: 'S1', category: 'All Checker Server# 1', icon: 'AL', name: 'US - NEW - Verizon Finance Check [IMEI]', price: 0.02, time: 'Instant' },
  { id: 'S2', category: 'All Checker Server# 1', icon: 'AL', name: 'US - OLD - Verizon Clean/Lost Check [IMEI]', price: 0.03, time: 'Instant' },
  { id: 'S3', category: 'All Checker Server# 2', icon: 'AL', name: 'US Verizon Status Check Pro', price: 0.03, time: 'Instant' },
  { id: 'S4', category: 'United States - Network Unlock', icon: 'UN', name: 'US Verizon iPhone and iPad All Models Support (Eligible Clean IMEI)', price: 79.00, time: '7-40 days' },
  { id: 'S5', category: 'Unbarring - Bad IMEI To Cleaning (Not Unlock)', icon: 'UN', name: 'Verizon USA - Unbarring Service / Status Cleaning From Lost & Stolen', price: 32.00, time: '7-20 days' }
];

const ORDERS_FILE = path.join(__dirname, 'data_orders.json');
const CHECKS_FILE = path.join(__dirname, 'data_checks.json');
const SYSTEM_LOG = path.join(__dirname, 'system.log');

const logEvent = (action, details) => {
  const logEntry = `[${new Date().toISOString()}] ACTION: ${action} | DETAILS: ${JSON.stringify(details)}\n`;
  fs.appendFileSync(SYSTEM_LOG, logEntry);
};

const initStorage = (file, defaultData = []) => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
};

initStorage(ORDERS_FILE, [{ id: 'ORD-1001', imei: '359206289946428', model: "IPHONE 16,NAMM,128GB,UMRN", status: 'success', price: 115.00, date: '2026-03-13 10:00' }]);
initStorage(CHECKS_FILE, []);

const readData = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => { console.log('WS linked'); });

// --- INTEL ENGINES ---
const fetchSickWData = async (imei, serviceId = "1") => {
  const apiKey = process.env.SICKW_API_KEY;
  if (!apiKey || apiKey.includes('YOUR_')) return generateAppleMock(imei);
  try {
    const response = await axios.get(`https://sickw.com/api.php?key=${apiKey}&format=json&imei=${imei}&service=${serviceId}`);
    return response.data;
  } catch (err) { return generateAppleMock(imei); }
};

const generateAppleMock = (imei) => {
  if (imei === '359206289946428') {
    return {
      modelDescription: 'IPHONE 16,NAMM,128GB,UMRN', imei, imei2: '359206289782674', 
      meid: '35920628994642', serialNumber: 'D77M2W1RC6', purchaseDate: '2025-09-23', 
      warrantyStatus: 'Limited Warranty', activationStatus: 'Activated', fmiStatus: 'OFF', 
      icloudStatus: 'Clean', mdmStatus: 'OFF', blacklistStatus: 'CLEAN', 
      lockedCarrier: '10 - Unlock', simLockStatus: 'Unlocked', nextTetherPolicy: '10 - Unlock'
    };
  }
  return {
    modelDescription: `IPHONE 16 PRO,GLOBAL,256GB`, imei, imei2: `35${Math.floor(Math.random()*10**12)}`, 
    meid: imei.slice(0,14), serialNumber: `G0N${imei.slice(-4)}QX2NQ`, activationStatus: 'Activated',
    fmiStatus: 'OFF', icloudStatus: 'Clean', mdmStatus: 'OFF', blacklistStatus: 'CLEAN',
    lockedCarrier: 'US AT&T', simLockStatus: 'Locked', nextTetherPolicy: 'US AT&T'
  };
};

const generateSamsungMock = (imei) => {
  return {
    modelDescription: 'SAMSUNG GALAXY S24 ULTRA,512GB,TITANIUM BLACK',
    imei: imei, serialNumber: `R5CW${imei.slice(-6).toUpperCase()}`,
    modelCode: 'SM-S928B/DS', productionDate: '2026-01-10', knoxStatus: '0x0 (Valid)',
    carrier: 'Verizon (USA)', simLockStatus: 'Locked', blacklistStatus: 'CLEAN',
    region: 'North America', recommendation: 'Eligible for Samsung Official Network Unlock.'
  };
};

const getPriceForModel = (model, isAdmin = false) => {
  if (!isAdmin) return 1.99;
  const m = model.toUpperCase();
  if (m.includes('17 PRO MAX') || m.includes('17 ULTRA') || m.includes('S24 ULTRA')) return 250.00;
  if (m.includes('17') || m.includes('S24')) return 180.00;
  if (m.includes('16')) return 115.00;
  if (m.includes('15')) return Number((Math.random()*(118-97)+97).toFixed(2));
  if (m.includes('14')) return Number((Math.random()*(98-85)+85).toFixed(2));
  return 78.00;
};

// --- ROUTES ---
app.get('/api/orders', (req, res) => res.json(readData(ORDERS_FILE)));
app.get('/api/services', (req, res) => res.json(SERVICES));

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) { res.json({ success: true }); }
  else { res.status(401).send(); }
});

app.post('/api/check-imei', async (req, res) => {
  const { imei, service, brand } = req.body;
  if (!imei || imei.length !== 15) return res.status(400).json({ error: 'Invalid IMEI' });
  try {
    const report = (brand === 'samsung') ? generateSamsungMock(imei) : await fetchSickWData(imei, service);
    logEvent('IMEI_CHECK', { imei, brand });
    const checks = readData(CHECKS_FILE);
    checks.unshift({ ...report, brand, timestamp: new Date().toISOString() });
    writeData(CHECKS_FILE, checks);
    res.json(report);
  } catch (err) { res.status(500).json({ error: 'Check Failed' }); }
});

// --- NOTIFICATION ENGINE ---
const sendTelegramAlert = async (message) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || token.includes('YOUR_')) return;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: `🚀 [IUNLOCK INTEL] NEW ORDER\n${message}`,
      parse_mode: 'HTML'
    });
  } catch (err) {
    console.error('Telegram Alert Failed:', err.message);
  }
};

app.post('/api/orders', (req, res) => {
  const { imei, model, isAdmin } = req.body;
  const orders = readData(ORDERS_FILE);
  const newOrder = {
    id: `ORD-${Math.floor(1000+Math.random()*9000)}`,
    imei, model, status: 'in process', price: getPriceForModel(model, isAdmin),
    processingTime: '1-14 Business Days', date: new Date().toISOString().slice(0,16).replace('T',' ')
  };
  orders.unshift(newOrder); writeData(ORDERS_FILE, orders);
  
  // Trigger Real-time Alert
  sendTelegramAlert(`<b>ID:</b> ${newOrder.id}\n<b>Model:</b> ${model}\n<b>IMEI:</b> ${imei}\n<b>Price:</b> $${newOrder.price}`);
  
  io.emit('order_updated'); res.status(201).json(newOrder);
});

app.patch('/api/orders/:id/status', (req, res) => {
  const orders = readData(ORDERS_FILE);
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx !== -1) { 
    orders[idx].status = req.body.status; 
    writeData(ORDERS_FILE, orders); io.emit('order_updated'); res.json({ success: true });
  } else res.status(404).send();
});

server.listen(port, () => { console.log(`MULTI-BRAND Backend at ${port}`); });
