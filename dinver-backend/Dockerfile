FROM node:22-bookworm-slim AS builder
  WORKDIR /app
  # Install build tools and curl for dotenvx
  RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
  RUN curl -sfS https://dotenvx.sh/install.sh | sh 

  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm prune --production

FROM node:22-bookworm-slim AS runner
  WORKDIR /app
  ARG NODE_ENV=production
  ENV NODE_ENV=${NODE_ENV}

  # Install runtime dependencies: ffmpeg, jemalloc
  RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libjemalloc2 \
    ca-certificates \
    && ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/lib/libjemalloc.so \
    && rm -rf /var/lib/apt/lists/*

  # Memory Allocator Tuning (Jemalloc)
  ENV LD_PRELOAD=/usr/lib/libjemalloc.so
  ENV MALLOC_CONF=background_thread:true,dirty_decay_ms:1000,muzzy_decay_ms:1000

  # Node.js V8 Memory Tuning for 8GB Machine
  # 5632MB (5.5GB) Max Heap, leaving ~2.5GB buffer for OS + FFmpeg.
  # 128MB Semi-space to reduce GC frequency on high throughput.
  ENV NODE_OPTIONS="--max-old-space-size=5632 --max-semi-space-size=128"

  # Copy dotenvx binary from builder
  COPY --from=builder /usr/local/bin/dotenvx /usr/local/bin/dotenvx
  COPY --from=builder /app/.env.${NODE_ENV} ./

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

  CMD ["dotenvx", "run", "--", "node", "src/server.js"]