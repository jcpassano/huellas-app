const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../db');
const { signToken, requireAuth } = require('../auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim();

    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Ingresá un email válido.' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña tiene que tener al menos 6 caracteres.' });
    if (!name) return res.status(400).json({ error: 'Contanos cómo te llamás.' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'Ya hay una cuenta con ese email. Iniciá sesión.' });

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (id, email, password_hash, name) VALUES ($1,$2,$3,$4)',
      [id, email, passwordHash, name]
    );
    const user = { id, email, name };
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'No se pudo crear la cuenta. Probá de nuevo.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const result = await pool.query('SELECT id, email, name, password_hash FROM users WHERE email = $1', [email]);
    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    const user = { id: row.id, email: row.email, name: row.name };
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'No se pudo iniciar sesión. Probá de nuevo.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [req.userId]);
  const row = result.rows[0];
  if (!row) return res.status(401).json({ error: 'Sesión inválida.' });
  res.json({ user: row });
});

// Lookup público de nombres (para el ranking de la comunidad). Nunca expone email.
router.get('/users', async (req, res) => {
  const ids = String(req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!ids.length) return res.json({});
  const result = await pool.query('SELECT id, name FROM users WHERE id = ANY($1::uuid[])', [ids]);
  const map = {};
  result.rows.forEach(r => { map[r.id] = { name: r.name }; });
  res.json(map);
});

module.exports = router;
