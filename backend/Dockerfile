FROM node:20-alpine

WORKDIR /app

# Install ALL dependencies (dev included — TypeScript needed for build)
COPY package*.json ./
RUN npm install

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# Prune dev dependencies — keep only production runtime
RUN npm prune --omit=dev

EXPOSE 4000

CMD ["node", "dist/index.js"]
