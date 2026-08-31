FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/

RUN npm install

COPY . .

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && node apps/api/dist/prisma/seed.js && node apps/api/dist/src/main.js"]
