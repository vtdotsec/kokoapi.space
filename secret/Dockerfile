# kokoapi.space — ephemeral sharing service ("/secret/").
# Plain Node HTTP server, zero npm dependencies.

FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=8787 \
    HOST=0.0.0.0 \
    DATA_DIR=/data

WORKDIR /app

# Only the server and its static assets ship in the image.
COPY server.mjs ./
COPY public ./public

RUN mkdir -p /data \
    && chown -R node:node /data \
    && chown -R node:node /app

USER node

EXPOSE 8787

CMD ["node", "server.mjs"]
