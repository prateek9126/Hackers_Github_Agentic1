# ==============================================================================
# SIH26153 React Frontend Dashboard Multi-Stage Dockerfile
# ==============================================================================

# Stage 1: Build static assets
FROM node:22-alpine AS build

WORKDIR /app

# Copy dependency specifications
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application source tree
COPY . .

# Build production bundle with Vite & TypeScript compiler
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
