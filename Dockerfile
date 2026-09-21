# Opcional: DigitalOcean App Platform puede desplegar este proyecto sin
# Dockerfile (detecta que es una app Node.js por package.json). Este
# archivo queda por si en algún momento preferís construir vos la imagen
# (por ejemplo para correrla en un Droplet con Docker).
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/server.js"]
