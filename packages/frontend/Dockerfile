# The workspace lockfile includes Rollup's GNU binary, not its musl binary.
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/frontend ./packages/frontend

RUN npm ci --include-workspace-root \
  --workspace=@tracelens/shared \
  --workspace=@tracelens/frontend \
  --ignore-scripts
# Restore esbuild's platform executable when the workspace lock omits it.
RUN npm rebuild esbuild
RUN npm run build --workspace=@tracelens/shared

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build --workspace=@tracelens/frontend

FROM nginx:alpine
RUN sed -i -e '/^user /d' -e 's#^pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf \
  && chown -R nginx:nginx /var/cache/nginx
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

USER 101:101
EXPOSE 5173
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:5173/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
