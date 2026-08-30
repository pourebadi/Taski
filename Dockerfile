FROM node:20-slim

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
