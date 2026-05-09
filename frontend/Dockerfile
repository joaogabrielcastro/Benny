# Build estático (evita Nixpacks lento / timeout no Coolify)
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# URL da API em produção — configure no Coolify como Build Argument / variável de build
ARG VITE_API_URL=https://api-benny.jwsoftware.com.br/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
