# Сборка из корня монорепо: docker build -f apps/admin/Dockerfile --build-arg VITE_API_URL=https://api.example.com \
#   --build-arg VITE_ADMIN_BOT_USERNAME=fitpal_bot .
FROM node:22-alpine AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter @fitpal/admin...
# Vite вшивает VITE_* в бандл на этапе сборки, поэтому адрес API передаётся как build arg
ARG VITE_API_URL
ARG VITE_ADMIN_BOT_USERNAME
ENV VITE_API_URL=$VITE_API_URL VITE_ADMIN_BOT_USERNAME=$VITE_ADMIN_BOT_USERNAME
RUN pnpm turbo run build --filter @fitpal/admin

FROM nginx:1.29-alpine AS runtime
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
