# Build from repository root:
# docker build -f integrations/chatgpt-plugin/Dockerfile -t documint-chatgpt .
FROM node:22-slim AS builder
WORKDIR /work
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY src ./src
COPY integrations/chatgpt-plugin ./integrations/chatgpt-plugin
WORKDIR /work/integrations/chatgpt-plugin
RUN npm install --no-audit --no-fund && npm run build

FROM node:22-slim
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
WORKDIR /app
COPY --from=builder /work/integrations/chatgpt-plugin/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=builder /work/integrations/chatgpt-plugin/server.mjs ./
COPY --from=builder /work/integrations/chatgpt-plugin/repositoryFetch.mjs ./
COPY --from=builder /work/integrations/chatgpt-plugin/dist ./dist
USER node
EXPOSE 8787
CMD ["node", "server.mjs"]
