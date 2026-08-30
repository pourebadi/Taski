# cache-bust: v5
FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY . .

RUN npm install
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js && node dist/src/main.js"]
