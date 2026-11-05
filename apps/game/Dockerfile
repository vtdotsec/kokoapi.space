FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
ENV DATA_DIR=/data
WORKDIR /app
COPY --chown=node:node server.mjs ./server.mjs
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
EXPOSE 8789
USER node
CMD ["node", "server.mjs"]
