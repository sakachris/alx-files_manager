const express = require('express');
const startServer = require('./libs/boot');
const injectRoutes = require('./routes');
const injectMiddlewares = require('./libs/middlewares');

const server = express();

injectMiddlewares(server);
injectRoutes(server);
startServer(server);

module.exports = server;
