const express = require('express');
const flights = require('../data/flights.json');
const airlines = require('../data/airlines.json');

const apiRouter = express.Router();

apiRouter.route('/').get((req, res) => {
  res.send(flights);
});

apiRouter.route('/airlines').get((req, res) => {
  res.send(airlines);
});

module.exports = apiRouter;