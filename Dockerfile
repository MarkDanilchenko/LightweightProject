ARG NODE_VERSION=24-alpine

# --- BUILD STAGE ---
FROM node:${NODE_VERSION} AS builder

LABEL maintainer="2026 MyHomeworks, { }"

WORKDIR /LightweightProject

COPY package*.json ./
COPY tsconfig*.json ./
COPY patches ./patches

RUN npm ci --legacy-peer-deps

COPY certs ./certs
COPY screenshots ./screenshots
COPY server ./server
COPY shared ./shared

RUN npm run clear:server && npm run build:server

# --- RUNTIME STAGE ---
FROM node:${NODE_VERSION} AS production

LABEL maintainer="2026 MyHomeworks, { }"

WORKDIR /LightweightProject

ENV NODE_ENV=production

COPY package*.json ./
COPY patches ./patches
COPY tsconfig*.json ./

RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

COPY --from=builder /LightweightProject/server/dist ./server/dist
COPY --from=builder /LightweightProject/server/templates ./server/templates
COPY --from=builder /LightweightProject/shared ./shared
COPY --from=builder /LightweightProject/certs ./certs

# Switch to non-root user for security reasons;
USER node

EXPOSE 3000

# Run server API by default;
CMD ["node", "server/dist/src/main.js"]
