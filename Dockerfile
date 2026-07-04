# Stage 1: build the React frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime — zero-dependency Node server serving API + static files
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/data
COPY --from=build /app/dist ./dist
COPY server ./server
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server/index.js"]
