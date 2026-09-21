require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { init } = require('./db');
const { useSpaces, LOCAL_DIR } = require('./storage');
const authRoutes = require('./routes/auth');
const collectionsRoutes = require('./routes/collections');
const uploadsRoutes = require('./routes/uploads');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/uploads', uploadsRoutes);

// Fotos guardadas en disco local (solo cuando no hay Spaces configurado).
if (!useSpaces) {
  app.use('/uploads', express.static(LOCAL_DIR));
}

// Frontend estático (la app en sí).
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Huellas escuchando en el puerto ${PORT} (almacenamiento de fotos: ${useSpaces ? 'DigitalOcean Spaces' : 'disco local'})`);
    });
  })
  .catch((err) => {
    console.error('No se pudo inicializar la base de datos:', err);
    process.exit(1);
  });
