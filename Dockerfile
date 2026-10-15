FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# husky is a dev dependency; its git hook setup has no place in an image
RUN npm pkg delete scripts.prepare

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate && pnpm exec nest build

FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
