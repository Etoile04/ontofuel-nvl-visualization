# Stage 1: Build
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY public ./public
COPY src ./src
COPY tsconfig.json ./

ARG DATA_URL=/data/nvl_ontology_data.json
ENV REACT_APP_DATA_URL=$DATA_URL

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

# Custom nginx config for SPA routing and CORS (for iframe embedding)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
