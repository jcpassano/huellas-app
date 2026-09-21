# Poner Huellas a funcionar en DigitalOcean

Esta guía asume que nunca desplegaste nada en DigitalOcean. Son todos pasos
con el mouse, en la web de DigitalOcean — no hace falta usar la terminal,
salvo un par de comandos cortos para subir el código a GitHub (paso 1).

## Antes de arrancar: cuánto sale por mes

DigitalOcean cobra por lo que usás. Con la configuración más chica posible
para arrancar (suficiente para probarla con la gente de tu barrio o una
comunidad chica):

| Qué | Para qué | Costo aprox. |
|---|---|---|
| App Platform (servicio web) | corre el servidor de Huellas | USD 5/mes |
| Base de datos (Dev Database, Postgres) | guarda mascotas, avistamientos, etc. | USD 7/mes |
| Spaces (almacenamiento) | guarda las fotos que suba la gente | USD 5/mes |
| **Total** | | **~USD 17/mes** |

Podés arrancar sin Spaces (las fotos se guardan en el servidor), pero en
App Platform el disco se borra en cada actualización de la app, así que las
fotos desaparecerían — por eso lo recomendamos desde el principio si la app
va a tener uso real. La "Dev Database" es la opción más barata para
arrancar; no tiene copias de seguridad automáticas como la versión
"Production", así que si Huellas crece y te importa no perder los datos,
en algún momento conviene migrar a una base de datos "Production" (unos
USD 15/mes más).

Estos precios son los que están publicados hoy en digitalocean.com/pricing;
DigitalOcean los puede cambiar, así que confirmalos ahí antes de cargar la
tarjeta.

---

## Paso 1 — Subir el código a GitHub

DigitalOcean App Platform despliega el código desde un repositorio de
GitHub (es gratis crear una cuenta y un repo).

1. Si no tenés cuenta, creá una en [github.com](https://github.com).
2. Creá un repositorio nuevo (podés dejarlo **privado**). Nombre sugerido:
   `huellas-app`. No marques ninguna opción de "agregar README" — lo vamos
   a subir ya con contenido.
3. En tu computadora, dentro de esta carpeta (`huellas-server/`), corré:

   ```
   git init
   git add .
   git commit -m "Primera versión de Huellas"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/huellas-app.git
   git push -u origin main
   ```

   (Reemplazá `TU_USUARIO` por tu usuario de GitHub. Si te pide iniciar
   sesión, seguí las instrucciones que te muestra la terminal o usá
   [GitHub Desktop](https://desktop.github.com) si preferís no usar la
   terminal para este paso.)

## Paso 2 — Crear el Space (para las fotos)

1. En el panel de DigitalOcean, andá a **Spaces Object Storage** → **Create
   a Spaces Bucket**.
2. Elegí una región (por ejemplo `nyc3`) y un nombre único, por ejemplo
   `huellas-fotos`.
3. Una vez creado, andá a **API** → **Spaces Keys** → **Generate New Key**.
   Guardá el **Access Key** y el **Secret Key** que te muestra (el secret
   solo se ve una vez).

## Paso 3 — Crear la App

1. En el panel, andá a **Apps** → **Create App**.
2. Elegí **GitHub** como fuente, autorizá el acceso si te lo pide, y
   seleccioná el repositorio `huellas-app` y la rama `main`.
3. DigitalOcean va a detectar que es una app de Node.js sola (por el
   `package.json`) y va a proponer:
   - Build command: `npm install`
   - Run command: `npm start`

   Dejalos así.
4. En el paso de **Resources**, agregá un componente de base de datos:
   **Add Resource** → **Database** → **Dev Database** → Postgres. Esto
   crea la base y la conecta automáticamente al servicio (la variable
   `DATABASE_URL` se completa sola).
5. En **Environment Variables** del servicio web, agregá:
   - `JWT_SECRET`: inventá una frase larga y random (por ejemplo, generá
     una en [1password.com/password-generator](https://1password.com/password-generator/)
     o cualquier generador de contraseñas — cuanto más larga, mejor).
     Marcala como **Encrypted**.
   - `SPACES_KEY`: el Access Key del paso 2. Marcala como **Encrypted**.
   - `SPACES_SECRET`: el Secret Key del paso 2. Marcala como **Encrypted**.
   - `SPACES_BUCKET`: el nombre que le pusiste al Space (ej. `huellas-fotos`).
   - `SPACES_REGION`: la región que elegiste (ej. `nyc3`).
   - `SPACES_ENDPOINT`: `https://nyc3.digitaloceanspaces.com` (cambiá
     `nyc3` si elegiste otra región).
6. Elegí el plan más chico del servicio web (Basic, ~USD 5/mes) y confirmá.
7. Dale a **Create Resources**. El primer deploy tarda unos minutos.

Cuando termine, DigitalOcean te da una URL tipo
`https://huellas-xxxxx.ondigitalocean.app` — ya podés abrirla y va a
mostrar la pantalla de "Iniciá sesión / Creá una cuenta". Registrate con
tu email y ya estás usando la app real.

## Paso 4 (opcional) — Dominio propio

Si tenés un dominio (por ejemplo `huellas.com.ar`), en la app entrá a
**Settings → Domains** y seguí las instrucciones para apuntarlo. DigitalOcean
te da un certificado HTTPS gratis automáticamente.

## Actualizar la app más adelante

Cualquier cambio que yo te ayude a hacer después, te lo voy a dejar en esta
misma carpeta. Para publicarlo, hacés `git add . && git commit -m "..." &&
git push` — App Platform redespliega solo con cada push (tiene
"Autodeploy" activado por defecto).

## Cómo quedan tus datos guardados

- Las fichas de mascotas, avistamientos, contactos, etc. quedan en la base
  de datos Postgres que creaste en el Paso 3.
- Las fotos quedan en el Space que creaste en el Paso 2.
- El alias de Mercado Pago / PayPal para colaborar con Huellas lo cargás
  vos mismo la primera vez que entrás a "Colaborar con Huellas" → "Cargar
  los alias" — quedás como administrador automáticamente y nadie más los
  puede cambiar (ahora sí queda controlado por el servidor, no solo por la
  pantalla).

## Si algo falla

En el panel de la App, la pestaña **Runtime Logs** muestra los errores del
servidor en vivo — es el primer lugar para mirar si algo no anda. Pegame
el error de ahí y seguimos desde acá.
