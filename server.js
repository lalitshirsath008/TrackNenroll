
/**
 * TrackNEnroll Backend - Production Grade Node.js Server
 * Tech Stack: Node.js, Express, SQLite3, Socket.io, JWT
 */

// NOTE: This code is meant to be run in a Node.js environment.
// To use this locally:
// 1. Install dependencies: npm install express sqlite3 bcryptjs jsonwebtoken cors socket.io
// 2. Run: node server.js

/*
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// --- DATABASE INITIALIZATION (SQLite) ---

const db = new sqlite3.Database('./tracknenroll.db', (err) => {
  if (err) console.error('Database connection error:', err.message);
  else console.log('Connected to the SQLite database.');
});

// Create tables if they don't exist
db.serialize(() => {
  // Users Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT
  )`);

  // Student Leads Table
  db.run(`CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    sourceFile TEXT,
    department TEXT,
    assignedToHOD TEXT,
    assignedToTeacher TEXT,
    response TEXT,
    stage TEXT DEFAULT 'Unassigned',
    callVerified INTEGER DEFAULT 0,
    callTimestamp TEXT,
    FOREIGN KEY (assignedToHOD) REFERENCES users (id),
    FOREIGN KEY (assignedToTeacher) REFERENCES users (id)
  )`);

  // Messages Table
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId TEXT NOT NULL,
    receiverId TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'sent',
    FOREIGN KEY (senderId) REFERENCES users (id),
    FOREIGN KEY (receiverId) REFERENCES users (id)
  )`);
});

// --- AUTH MIDDLEWARE ---

const JWT_SECRET = 'tracknenroll_secure_2025';

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized access' });
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

// --- API ROUTES ---

// 1. Authentication
app.post('/api/auth/register', async (req, res) => {
  const { id, name, email, password, role, department } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const sql = `INSERT INTO users (id, name, email, password, role, department) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [id, name, email, hashedPassword, role, department], function(err) {
    if (err) return res.status(400).json({ error: 'Registration failed: ' + err.message });
    res.json({ message: 'User registered successfully' });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'User not found' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, role: user.role, dept: user.department }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email, department: user.department } });
  });
});

// 2. Leads Management
app.get('/api/leads', authenticate, (req, res) => {
  let sql = 'SELECT * FROM leads';
  let params = [];
  
  if (req.user.role === 'HOD') {
    sql += ' WHERE department = ? OR assignedToHOD = ?';
    params = [req.user.dept, req.user.id];
  } else if (req.user.role === 'Teacher') {
    sql += ' WHERE assignedToTeacher = ?';
    params = [req.user.id];
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/leads/assign', authenticate, (req, res) => {
  const { leadIds, assigneeId, role } = req.body;
  const column = role === 'HOD' ? 'assignedToHOD' : 'assignedToTeacher';
  const placeholders = leadIds.map(() => '?').join(',');
  
  const sql = `UPDATE leads SET ${column} = ?, stage = 'Assigned' WHERE id IN (${placeholders})`;
  db.run(sql, [assigneeId, ...leadIds], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, updated: this.changes });
  });
});

// 3. Real-time Messages
app.get('/api/messages/:partnerId', authenticate, (req, res) => {
  const sql = `SELECT * FROM messages WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?) ORDER BY timestamp ASC`;
  db.all(sql, [req.user.id, req.params.partnerId, req.params.partnerId, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (userId) => socket.join(userId));
  
  socket.on('sendMessage', (data) => {
    const { id, senderId, receiverId, text } = data;
    const sql = `INSERT INTO messages (id, senderId, receiverId, text) VALUES (?, ?, ?, ?)`;
    db.run(sql, [id, senderId, receiverId, text], (err) => {
      if (!err) {
        io.to(receiverId).emit('newMessage', { ...data, timestamp: new Date() });
      }
    });
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Backend Server running on http://localhost:${PORT}`));
*/
