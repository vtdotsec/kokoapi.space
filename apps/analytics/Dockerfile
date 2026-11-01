FROM node:24-alpine

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8788 \
    DATA_DIR=/data

WORKDIR /app
COPY --chown=node:node server.mjs client.js client.css dashboard.html dashboard.js dashboard.css ./
RUN mkdir -p /data && chown node:node /data

USER node
EXPOSE 8788
CMD ["node", "server.mjs"]
