FROM node:22-bookworm-slim
WORKDIR /app

# bcrypt (nativo) + postgresql-client para backups com pg_dump
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ postgresql-client \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p storage

ENV NODE_ENV=production
EXPOSE 3011

ENTRYPOINT ["node", "docker-entrypoint.mjs"]
CMD ["node", "server.js"]
