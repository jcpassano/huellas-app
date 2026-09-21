// Rutas genéricas de "colección" (pets, founds, sightings, businesses,
// adoptions, contacts, settings). El frontend le sigue hablando a esto
// como si fuera una base de datos tipo Firestore (colección/documento),
// pero acá abajo es una sola tabla Postgres con JSONB.
//
// Regla de permisos, igual para todas las colecciones:
//  - Leer: cualquier usuario autenticado.
//  - Crear (el documento no existe todavía): cualquier usuario autenticado;
//    server fuerza ownerId = quien hace la request (nunca lo que mande el cliente).
//  - Actualizar / borrar: solo quien lo creó.
// Esto es lo que permite, por ejemplo, que el alias de donación quede
// fijo para quien lo cargue primero.
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

const FIELD_RE = /^[a-zA-Z0-9_]+$/;
const COLLECTION_RE = /^[a-zA-Z0-9_]+$/;

function parseFilters(raw) {
  if (!raw) return [];
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { return []; }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(f => Array.isArray(f) && f.length === 3 && FIELD_RE.test(f[0]) && (f[1] === '==' || f[1] === 'in'));
}

router.get('/:collection', async (req, res) => {
  const collection = req.params.collection;
  if (!COLLECTION_RE.test(collection)) return res.status(400).json({ error: 'Colección inválida.' });

  const filters = parseFilters(req.query.filters);
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);

  const params = [collection];
  const where = ['collection = $1'];
  filters.forEach(([field, op, value]) => {
    if (op === '==') {
      params.push(String(value));
      where.push(`data->>'${field}' = $${params.length}`);
    } else if (op === 'in') {
      const arr = Array.isArray(value) ? value.map(String) : [String(value)];
      if (arr.length === 0) { where.push('false'); return; }
      params.push(arr);
      where.push(`data->>'${field}' = ANY($${params.length})`);
    }
  });

  params.push(limit);
  const sql = `SELECT id, owner_id, data, created_at, updated_at FROM items WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT $${params.length}`;
  try {
    const result = await pool.query(sql, params);
    res.json({ docs: result.rows.map(rowToDoc) });
  } catch (err) {
    console.error('list error', collection, err);
    res.status(500).json({ error: 'No se pudo leer la colección.' });
  }
});

router.get('/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  if (!COLLECTION_RE.test(collection)) return res.status(400).json({ error: 'Colección inválida.' });
  const result = await pool.query('SELECT id, owner_id, data, created_at, updated_at FROM items WHERE collection=$1 AND id=$2', [collection, id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'No existe.' });
  res.json({ doc: rowToDoc(result.rows[0]) });
});

// set (crear o reemplazar por completo)
router.put('/:collection/:id', async (req, res) => {
  await upsert(req, res, { merge: false });
});

// update (crear o mezclar campos)
router.patch('/:collection/:id', async (req, res) => {
  await upsert(req, res, { merge: true });
});

router.delete('/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  if (!COLLECTION_RE.test(collection)) return res.status(400).json({ error: 'Colección inválida.' });
  try {
    const existing = await pool.query('SELECT owner_id FROM items WHERE collection=$1 AND id=$2', [collection, id]);
    if (!existing.rows[0]) return res.json({ ok: true }); // ya no existe: éxito idempotente
    if (existing.rows[0].owner_id && existing.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'No podés borrar algo que no creaste vos.' });
    }
    await pool.query('DELETE FROM items WHERE collection=$1 AND id=$2', [collection, id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete error', collection, id, err);
    res.status(500).json({ error: 'No se pudo eliminar.' });
  }
});

async function upsert(req, res, { merge }) {
  const { collection, id } = req.params;
  if (!COLLECTION_RE.test(collection)) return res.status(400).json({ error: 'Colección inválida.' });
  const body = (req.body && typeof req.body === 'object') ? req.body : {};

  try {
    const existing = await pool.query('SELECT owner_id, data FROM items WHERE collection=$1 AND id=$2', [collection, id]);
    const row = existing.rows[0];

    if (row) {
      if (row.owner_id && row.owner_id !== req.userId) {
        return res.status(403).json({ error: 'No podés editar algo que no creaste vos.' });
      }
      const nextData = merge ? Object.assign({}, row.data, body) : Object.assign({}, body);
      nextData.ownerId = row.owner_id || req.userId; // el dueño real nunca lo decide el cliente
      const result = await pool.query(
        'UPDATE items SET data=$1, updated_at=now() WHERE collection=$2 AND id=$3 RETURNING id, owner_id, data, created_at, updated_at',
        [nextData, collection, id]
      );
      return res.json({ doc: rowToDoc(result.rows[0]) });
    }

    const nextData = Object.assign({}, body);
    nextData.ownerId = req.userId;
    const result = await pool.query(
      'INSERT INTO items (collection, id, owner_id, data) VALUES ($1,$2,$3,$4) RETURNING id, owner_id, data, created_at, updated_at',
      [collection, id, req.userId, nextData]
    );
    res.json({ doc: rowToDoc(result.rows[0]) });
  } catch (err) {
    console.error('upsert error', collection, id, err);
    res.status(500).json({ error: 'No se pudo guardar.' });
  }
}

function rowToDoc(row) {
  return Object.assign({ id: row.id }, row.data);
}

module.exports = router;
