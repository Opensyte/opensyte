##### DEPENDENCIES

FROM --platform=linux/amd64 oven/bun:1-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install Prisma Client - remove if not using Prisma
# Copied before install so the `prisma generate` postinstall script can run.

COPY prisma ./prisma

# Install dependencies based on the bun lockfile

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

##### BUILDER

FROM --platform=linux/amd64 oven/bun:1-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
ARG DATABASE_URL
ARG NEXT_PUBLIC_CLIENTVAR
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so they
# must be present during `bun run build`. Railway exposes service variables as
# build args automatically; promote it to an ENV so Next.js picks it up.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ENV NEXT_TELEMETRY_DISABLED 1

ENV SKIP_ENV_VALIDATION=1
# Placeholder so import-time clients (e.g. Resend) don't throw during the build.
# Build-only; the runner stage is a separate image and supplies real values at runtime.
ENV RESEND_API_KEY="re_placeholder_build_only"

RUN bun run build

##### RUNNER

FROM --platform=linux/amd64 oven/bun:1-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

# ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
ENV PORT=3000

CMD ["bun", "server.js"]
