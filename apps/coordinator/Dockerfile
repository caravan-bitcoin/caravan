# Caravan coordinator app is platform agnostic, the build platform output can be reused.
FROM --platform=$BUILDPLATFORM node:20.19.3-bookworm-slim AS base

# Install all OS dependencies
FROM base AS builder
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update --yes && \
    apt-get upgrade --yes && \
    apt-get install --yes --no-install-recommends \
    build-essential

# Set the working directory
WORKDIR /app
RUN npm install -g turbo
COPY . .
# Optimize caching with docker
# https://turbo.build/repo/docs/handbook/deploying-with-docker
RUN turbo prune caravan-coordinator --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
WORKDIR /app

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
# Copy the scripts directory that contains check-node-versions.js
COPY --from=builder /app/scripts ./scripts
RUN npm ci

# Build the project
COPY --from=builder /app/out/full/ .
ENV NODE_OPTIONS=--max-old-space-size=32768

RUN npx turbo run build --filter=caravan-coordinator...

# Serve the production build files via nginx (will be served at http://localhost:80/#
# in docker vm. Map port 80 to a different port on the host machine to access the app)
FROM nginx:1.23 AS runner
WORKDIR /app
COPY --from=installer /app/apps/coordinator/build /usr/share/nginx/html/
