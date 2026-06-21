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
RUN rm -f /etc/nginx/conf.d/default.conf

# PORT dinâmico (Coolify) sem script externo — evita CRLF no Windows ao buildar
ENV PORT=80
EXPOSE 80

ENTRYPOINT ["/bin/sh", "-c", "LISTEN_PORT=\"${PORT:-80}\"; case \"$LISTEN_PORT\" in ''|*[!0-9]*) LISTEN_PORT=80;; esac; sed \"s/__LISTEN_PORT__/${LISTEN_PORT}/g\" /opt/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -t && exec nginx -g 'daemon off;'"]
