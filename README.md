# Huellas — servidor

Esta carpeta tiene todo lo necesario para que Huellas funcione como una
app real y operativa (no solo una demo dentro de Claude): backend en
Node.js/Express, base de datos Postgres, cuentas de usuario por email, y
subida de fotos a DigitalOcean Spaces.

Para ponerla en producción en tu cuenta de DigitalOcean, seguí **DEPLOY.md**
paso a paso.

## Estructura

```
huellas-server/
  public/           la app (HTML/CSS/JS) que ve la gente, más manifest.json,
                     el service worker e íconos para instalarla como app
  src/
    server.js       arranca todo
    db.js           conexión a Postgres y creación de tablas
    auth.js         helpers de sesión (JWT)
    storage.js      guarda fotos (Spaces o disco local)
    routes/
      auth.js        registro / login / perfil
      collections.js CRUD genérico (mascotas, avistamientos, adopciones,
                      establecimientos, contactos, alias de donación)
      uploads.js      subida de fotos
  app.yaml          plantilla de configuración para DigitalOcean App Platform
  Dockerfile        opcional, por si preferís construir la imagen vos
  DEPLOY.md         guía paso a paso para publicarla en DigitalOcean
```

## Probarla en tu computadora antes de publicarla (opcional)

Necesitás Node.js 18+ y Postgres instalado.

```
npm install
cp .env.example .env
# editá .env: al menos DATABASE_URL apuntando a un Postgres que tengas corriendo,
# y un JWT_SECRET cualquiera para probar
npm start
```

Abrí `http://localhost:8080` — vas a ver la pantalla de registro/login.
Sin `SPACES_KEY`/`SPACES_SECRET`/`SPACES_BUCKET` configurados, las fotos se
guardan en una carpeta `uploads/` local (para producción real usá Spaces,
ver DEPLOY.md).

## Qué cambió respecto a la versión de Claude

La app que veías en claude.ai usaba capacidades especiales de Claude (una
base de datos, identidad de usuario y subida de archivos) que solo existen
adentro de una conversación de Claude. Esta versión hace exactamente lo
mismo pero habla con este servidor propio en vez de con Claude, así que
funciona en cualquier navegador, en tu propio dominio, sin depender de
Claude para nada.

De paso, quedó más segura: antes, cualquiera que abriera la app podía en
teoría editar o borrar fichas de otra persona con un poco de maña (no había
nada del lado del servidor que lo impidiera). Ahora el servidor rechaza
cualquier edición o borrado que no sea de quien creó esa ficha — lo mismo
para el alias de Mercado Pago/PayPal: solo quien lo carga primero puede
cambiarlo después.
