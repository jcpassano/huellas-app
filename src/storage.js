// Guarda archivos subidos (fotos). Si hay credenciales de DigitalOcean
// Spaces configuradas, sube ahí (compatible con S3). Si no, los guarda en
// disco local bajo /uploads y los sirve como estáticos — así se puede
// probar todo el flujo sin gastar en Spaces todavía.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const useSpaces = !!(process.env.SPACES_KEY && process.env.SPACES_SECRET && process.env.SPACES_BUCKET);

let s3Client = null;
let PutObjectCommand = null;
if (useSpaces) {
  const { S3Client, PutObjectCommand: PutCmd } = require('@aws-sdk/client-s3');
  PutObjectCommand = PutCmd;
  s3Client = new S3Client({
    endpoint: process.env.SPACES_ENDPOINT || 'https://nyc3.digitaloceanspaces.com',
    region: process.env.SPACES_REGION || 'nyc3',
    credentials: {
      accessKeyId: process.env.SPACES_KEY,
      secretAccessKey: process.env.SPACES_SECRET
    }
  });
}

const LOCAL_DIR = path.join(__dirname, '..', 'uploads');
if (!useSpaces && !fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

function extFor(mimetype) {
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/webp') return '.webp';
  if (mimetype === 'image/gif') return '.gif';
  return '.jpg';
}

async function saveFile(buffer, mimetype) {
  const id = 'img_' + Date.now().toString(36) + '_' + crypto.randomBytes(6).toString('hex');
  const filename = id + extFor(mimetype);

  if (useSpaces) {
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.SPACES_BUCKET,
      Key: 'huellas/' + filename,
      Body: buffer,
      ACL: 'public-read',
      ContentType: mimetype
    }));
    const cdnBase = process.env.SPACES_CDN_BASE || `https://${process.env.SPACES_BUCKET}.${(process.env.SPACES_REGION || 'nyc3')}.digitaloceanspaces.com`;
    return { id, url: `${cdnBase}/huellas/${filename}` };
  }

  fs.writeFileSync(path.join(LOCAL_DIR, filename), buffer);
  const publicBase = process.env.PUBLIC_BASE_URL || '';
  return { id, url: `${publicBase}/uploads/${filename}` };
}

module.exports = { saveFile, useSpaces, LOCAL_DIR };
