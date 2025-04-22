# `discord-activity-spacetimedb-example`

This projects servers as an example on how to use [SpacetimeDB](https://github.com/clockworklabs/SpacetimeDB) for developing discord activities.

It uses [nginx](https://nginx.org/) to route discords requests to the appropriate service. This way your activity runs behind a single URL which you can map to your discord application.

## Structure 

[./client](./client) contains the client code that is run inside an iframe in discord. It's a vanilla typescript web application.

[./api](./api) contains a NodeJS web server which is used for OAuth authorization.

[./server](./server) contains the SpacetimeDB Module which handles all the backend logic, storage and networking.

[./nginx](./nginx) contains the configuration of the nginx proxy.


## Instructions
To get started copy `.env.example` to `.env` and fill in the variables.
```shell
# generate module bindings
spacetime generate --lang typescript --out-dir client/src/module_bindings --project-path server

# start client, server and database
docker compose up

# upload module to spacetimedb
spacetime publish --project-path server tictactoe
```