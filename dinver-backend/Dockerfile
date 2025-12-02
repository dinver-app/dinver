FROM node:21-bookworm-slim AS builder
  WORKDIR /app
  RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm prune --production

FROM node:21-bookworm-slim AS runner
  WORKDIR /app
  ENV NODE_ENV=staging

  RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libjemalloc2 \
    ca-certificates \
    && ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/lib/libjemalloc.so \
    && rm -rf /var/lib/apt/lists/*

  ENV LD_PRELOAD=/usr/lib/libjemalloc.so
  ENV MALLOC_CONF=background_thread:true,dirty_decay_ms:1000,muzzy_decay_ms:1000

  COPY --from=builder /app/package.json ./
  COPY --from=builder /app/node_modules ./node_modules
  COPY --from=builder /app/config ./config
  COPY --from=builder /app/locales ./locales
  COPY --from=builder /app/models ./models
  COPY --from=builder /app/services ./services
  COPY --from=builder /app/src ./src
  COPY --from=builder /app/utils ./utils
  COPY --from=builder /app/seeders ./seeders

  RUN mkdir -p logs && chown -R node:node /app

  USER node

  EXPOSE 3000

  CMD ["node", "src/server.js"]
