FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace root config files
COPY package.json package-lock.json tsconfig.base.json ./

# Copy only the packages we need to build the api (api depends on shared + graph)
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/

COPY packages/graph/package.json ./packages/graph/
COPY packages/graph/src ./packages/graph/src
COPY packages/graph/tsconfig.json ./packages/graph/

COPY packages/api/package.json ./packages/api/
COPY packages/api/src ./packages/api/src
COPY packages/api/tsconfig.json ./packages/api/

RUN npm ci --include-workspace-root \
  --workspace=@tracelens/shared \
  --workspace=@tracelens/graph \
  --workspace=@tracelens/api \
  --ignore-scripts
RUN npm run build --workspace=@tracelens/shared
RUN npm run build --workspace=@tracelens/graph
RUN npm run build --workspace=@tracelens/api

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/graph/dist ./packages/graph/dist
COPY --from=builder /app/packages/graph/package.json ./packages/graph/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "packages/api/dist/index.js"]
