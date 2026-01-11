# Use Node.js LTS
FROM node:20-slim as builder

WORKDIR /app

# Enable corepack for yarn/pnpm support
RUN corepack enable

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN yarn build

# Production image
FROM node:20-slim

WORKDIR /app

# Copy output from builder
COPY --from=builder /app/.output ./.output

# Expose port (default 3002)
EXPOSE 3004

# Set environment
ENV HOST=0.0.0.0
ENV PORT=3002
ENV NODE_ENV=production

# Start application
CMD ["node", ".output/server/index.mjs"]
