/**
 * Reference Backend API for Retweet Filter
 * A simple Express server for optional sync functionality
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { db } = require('./db');
const path = require('path');
const crypto = require('crypto');
const { JWT_SECRET, ADMIN_SECRET, CORS_ORIGINS, TOKEN_TTL } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin and non-browser requests have no Origin header.
      if (!origin || origin.startsWith('chrome-extension://') || CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed'));
    },
  })
);
app.use(express.json({ limit: '10mb' }));

// Auth middleware
const authMiddleware = require('./middleware/auth');

// Health check
app.get('/api/health', authMiddleware, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Issue an API token. Requires ADMIN_SECRET, compared in constant time.
function secretMatches(given) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(ADMIN_SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post('/api/auth/token', (req, res) => {
  const { username, secret } = req.body || {};

  if (!secretMatches(secret)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const name = typeof username === 'string' && username.trim() ? username.trim().slice(0, 64) : 'default';

  // Reuse the existing user for this username so their synced data stays attached.
  let user = db.prepare('SELECT id FROM users WHERE username = ?').get(name);
  if (!user) {
    user = { id: `user_${crypto.randomUUID()}` };
    db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(user.id, name);
  }

  const token = jwt.sign({ userId: user.id, username: name }, JWT_SECRET, { expiresIn: TOKEN_TTL });

  res.json({ token, userId: user.id });
});

// Routes (after /api/auth/token, because the sync router requires a token on everything under /api)
app.use('/api', require('./routes/sync'));

// Error handler
app.use((err, req, res, next) => {
  if (err.message === 'Origin not allowed') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Retweet Filter API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = { app, db };
