# syntax=docker/dockerfile:1

# ---- Build stage -----------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Build the static site
COPY . .
RUN npm run build

# ---- Runtime stage ---------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Custom minimal & hardened vhost config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static build output only - no runtime dependencies, no write access needed
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

EXPOSE 80
