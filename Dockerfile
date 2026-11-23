# Imagem para Hugging Face Spaces (SDK Docker, plano gratuito) ou qualquer servidor com Docker.
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=7860 \
    CACHE_DIR=/app/.cache

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Baixa o modelo de embeddings gratuito e pré-calcula o índice da base durante o build.
RUN node scripts/warmup.mjs

# Hugging Face executa o contêiner com o usuário 1000.
RUN chown -R 1000:1000 /app
USER 1000

EXPOSE 7860
CMD ["node", "server/index.js"]
