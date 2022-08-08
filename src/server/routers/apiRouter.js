const express = require('express');
const flights = require('../data/flights.json');

const apiRouter = express.Router();

apiRouter.route('/').get((req, res) => {
  res.send(flights);
});

module.exports = apiRouter;