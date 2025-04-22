FROM node AS builder

WORKDIR /app/api

COPY ./api/package*.json ./

RUN npm ci

COPY ./api .

RUN npm run build

FROM node:slim

ENV NODE_ENV production
USER node

WORKDIR /app/api

COPY ./api/package*.json ./

RUN npm ci --production

COPY --from=builder /app/api/dist ./dist

EXPOSE 3001

ENTRYPOINT ["node", "dist/main.js"]