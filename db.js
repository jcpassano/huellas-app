// Capa de datos: Postgres con un esquema simple tipo "documento" (una tabla
// `items` genérica para las colecciones de la app, más `users` para cuentas).
// Esto deja el resto del backend (rutas genéricas de colección) muy chico,
// y hace que el frontend pueda seguir hablando "como si fuera Firestore".
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false }
});

async function init() {
  // El id lo genera la aplicación (crypto.randomUUID()) para no depender
  // de extensiones de Postgres que algunos hosts administrados restringen.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (collection, id)
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_collection ON items(collection);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_owner ON items(collection, owner_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_status ON items(collection, (data->>'status'));`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_petid ON items(collection, (data->>'petId'));`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_category ON items(collection, (data->>'category'));`);
}

module.exports = { pool, init };
