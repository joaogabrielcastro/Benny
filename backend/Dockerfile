# Estágio de dependências: compila o bcrypt (nativo) e é descartado depois.
FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev \
  && npm cache clean --force

# Imagem final: sem toolchain de compilação, apenas o runtime.
FROM node:22-bookworm-slim
WORKDIR /app

# postgresql-client é usado pelo pg_dump nos backups
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p storage

ENV NODE_ENV=production
EXPOSE 3011

ENTRYPOINT ["node", "docker-entrypoint.mjs"]
CMD ["node", "server.js"]
