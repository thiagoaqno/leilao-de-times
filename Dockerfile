# Imagem usada pelo Fly.io para rodar o servidor
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# Instala só as dependências (aproveita cache quando o código muda)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copia o resto do projeto
COPY . .

ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
