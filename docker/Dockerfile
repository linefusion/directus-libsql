FROM node:18

ENV \
  PNPM_HOME="/pnpm" \
  CONFIG_PATH="/directus/config.js" \
  DB_FILENAME="/directus/database/database.db" \
  HOST="0.0.0.0" \
  PORT=8055 \
  PUBLIC_URL="http://localhost:8055" \
  MAX_PAYLOAD_SIZE="100mb" \
  KEY="5297cf37-b89e-4008-97bf-0312335300e2" \
  SECRET="5bee40a6-141f-45f1-bdd7-76ece5aab471" \
  ADMIN_EMAIL="admin@example.com" \
  ADMIN_PASSWORD="password" \
  LOG_LEVEL="info" \
  LOG_STYLE="pretty" \
  CACHE_ENABLED="true" \
  CACHE_STORE="memory" \
  STORAGE_LOCATIONS="local" \
  STORAGE_LOCAL_DRIVER="local" \
  STORAGE_LOCAL_ROOT="/directus/uploads" \
  EXTENSIONS_PATH="/directus/extensions"

RUN corepack enable

RUN corepack prepare pnpm@latest-9 --activate
RUN pnpm config set store-dir /pnpm/store

WORKDIR /directus/

COPY ./rootfs/directus/package.json /directus/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm pnpm install

COPY ./rootfs/ /
RUN \
  chmod +x /usr/bin/directus && \
  chmod +x /usr/bin/docker-entrypoint

# Envs

EXPOSE 8055

VOLUME [ "/directus/uploads", "/directus/database", "/directus/extensions" ]

SHELL ["/bin/bash", "-c"]

CMD "/usr/bin/docker-entrypoint"
