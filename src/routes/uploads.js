const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../auth');
const { saveFile } = require('../storage');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB por foto
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      return cb(new Error('Solo se aceptan imágenes (jpg, png, webp, gif).'));
    }
    cb(null, true);
  }
});

router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'No se pudo subir la foto.' });
    if (!req.file) return res.status(400).json({ error: 'Falta el archivo.' });
    try {
      const result = await saveFile(req.file.buffer, req.file.mimetype);
      res.json(result);
    } catch (e) {
      console.error('upload error', e);
      res.status(500).json({ error: 'No se pudo subir la foto. Probá de nuevo.' });
    }
  });
});

module.exports = router;
