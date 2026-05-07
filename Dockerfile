# syntax=docker/dockerfile:1

FROM node:25-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# Always install devDependencies (TypeScript, @types/node): host/CI often sets NODE_ENV=production for builds,
# which would otherwise skip dev deps and break `npm run build`.
RUN npm ci --ignore-scripts --include=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:25-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 65532 -S app && adduser -S -u 65532 -G app app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER app

ENTRYPOINT ["node", "dist/index.js"]
