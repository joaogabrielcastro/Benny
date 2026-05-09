# Build estático (evita Nixpacks lento / timeout no Coolify)
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

ARG VITE_API_URL=https://api-benny.jwsoftware.com.br/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /opt/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
  && rm -f /etc/nginx/conf.d/default.conf

# Porta padrão; Coolify pode sobrescrever com PORT=3000 (ver docker-entrypoint.sh)
ENV PORT=80
EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
