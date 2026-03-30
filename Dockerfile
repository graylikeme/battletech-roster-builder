FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/record-sheet/package.json packages/record-sheet/
COPY packages/web/package.json packages/web/
RUN npm ci
COPY packages/core packages/core
COPY packages/record-sheet packages/record-sheet
COPY packages/web packages/web
COPY tsconfig.json ./
RUN npm run web:build

FROM nginx:alpine
COPY --from=build /app/packages/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
