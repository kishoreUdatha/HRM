# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g typescript
COPY package*.json ./
RUN npm ci
COPY . .
RUN tsc

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3013
CMD ["node", "dist/index.js"]
