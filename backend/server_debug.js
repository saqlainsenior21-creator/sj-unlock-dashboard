const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const port = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise-secret-2026';

const db = new Database(path.join(__dirname, 'enterprise.db'));
db.pragma('journal_mode = WAL');

app.use(cors());
app.use(express.json());

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[DEBUG] Login attempt: email=${email}, password=${password}`);
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      console.log(`[DEBUG] User not found for email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log(`[DEBUG] User found: ${JSON.stringify({email: user.email, role: user.role, password: user.password})}`);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`[DEBUG] Password match: ${isMatch}`);
    
    if (isMatch) {
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
      res.json({ token, user: { email: user.email, balance: user.balance, role: user.role } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(`[DEBUG] Error during login: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/user/profile', (req, res) => { res.json({ email: 'saqlain.senior21@gmail.com', balance: 1000, role: 'admin' }); });
app.get('/api/orders', (req, res) => { res.json([]); });
app.get('/api/services', (req, res) => { res.json([]); });

server.listen(port, () => console.log(`DEBUG SERVER at ${port}`));
