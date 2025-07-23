FROM node:18-alpine
RUN apk add --no-cache openssl

# Puerto que espera Google Cloud Run
ENV PORT=8080
EXPOSE 8080

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force
# Remove CLI packages since we don't need them in production
RUN npm remove @shopify/cli

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

RUN npm run build

# Cambiar el CMD para usar el puerto de Google Cloud Run
CMD ["sh", "-c", "npm run setup && npm run start"]

ENV HOST=0.0.0.0
