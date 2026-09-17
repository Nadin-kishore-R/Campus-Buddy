# Stage 1: Build Vite React bundle
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Copy ONLY package manifests first to leverage Docker layer caching
COPY package.json package-lock.json* ./
COPY apps/user/package.json ./apps/user/package.json
COPY packages ./packages

# 2. Install dependencies (this layer is CACHED unless package.json changes)
RUN npm install

# 3. Copy application source code after dependency installation
COPY apps/user ./apps/user

# 4. Build the user app
RUN npm run build --workspace=apps/user

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

# Copy built frontend assets to Nginx html directory
COPY --from=builder /app/apps/user/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY apps/user/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
