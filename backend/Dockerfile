FROM node:22-bookworm-slim
WORKDIR /app

# bcrypt e dependências nativas compilam melhor em glibc (bookworm) que em alpine/musl
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3011

CMD ["node", "server.js"]
