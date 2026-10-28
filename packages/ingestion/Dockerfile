FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace root config files
COPY package.json package-lock.json tsconfig.base.json ./

# Copy only the packages we need to build ingestion
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/

COPY packages/ingestion/package.json ./packages/ingestion/
COPY packages/ingestion/src ./packages/ingestion/src
COPY packages/ingestion/tsconfig.json ./packages/ingestion/

RUN npm ci --workspace=@tracelens/shared --workspace=@tracelens/ingestion --ignore-scripts
RUN npm run build --workspace=@tracelens/shared
RUN npm run build --workspace=@tracelens/ingestion

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/ingestion/dist ./packages/ingestion/dist
COPY --from=builder /app/packages/ingestion/package.json ./packages/ingestion/
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 4001
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:4001/health || exit 1

CMD ["node", "packages/ingestion/dist/index.js"]
