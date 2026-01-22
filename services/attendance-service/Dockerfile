# Build stage - using Debian for native module support
FROM node:20-slim AS builder

# Install build dependencies for canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
# Install all dependencies including canvas and tensorflow
RUN npm install && npm install canvas @tensorflow/tfjs-node
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim

# Install runtime dependencies for canvas
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
# Copy node_modules from builder (includes compiled canvas)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/models ./models

EXPOSE 3004
CMD ["node", "dist/index.js"]
