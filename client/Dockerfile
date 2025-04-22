FROM node AS builder

WORKDIR /app/client
COPY ./client .

COPY ./.env ./../

RUN ["npm", "i"]
RUN ["npm", "run", "build"]

FROM nginx:alpine

WORKDIR /usr/share/nginx/
RUN rm -rf html
RUN mkdir html

WORKDIR /

COPY --from=builder ./app/client/dist /usr/share/nginx/html/

EXPOSE 8080

ENTRYPOINT ["nginx", "-g", "daemon off;"]