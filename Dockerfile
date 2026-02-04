FROM node:20-alpine

RUN apk add --no-cache iputils

RUN addgroup -S appgroup && \
    adduser -S -G appgroup -s /bin/sh -D appuser

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD ping -c 1 127.0.0.1 >/dev/null || exit 1

USER appuser
CMD ["node", "main.mjs"]
