# Сборка из корня монорепо: docker build -f apps/miniapp/Dockerfile --build-arg VITE_API_URL=https://api.example.com .
FROM node:22-alpine AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter @fitpal/miniapp...
# Vite вшивает VITE_* в бандл на этапе сборки, поэтому адрес API передаётся как build arg
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm turbo run build --filter @fitpal/miniapp

FROM nginx:1.29-alpine AS runtime
COPY apps/miniapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/miniapp/dist /usr/share/nginx/html
EXPOSE 80
