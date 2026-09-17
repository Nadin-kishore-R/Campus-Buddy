# Stage 1: Build Vite React bundle
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Copy ONLY package manifests first to leverage Docker layer caching
COPY package.json package-lock.json* ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY packages ./packages

# 2. Install dependencies (this layer is CACHED unless package.json changes)
RUN npm install

# 3. Copy application source code after dependency installation
COPY apps/admin ./apps/admin

# 4. Build the admin app
RUN npm run build --workspace=apps/admin

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

# Copy built frontend assets to Nginx html directory
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
