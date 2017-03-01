'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const _ = require('underscore');
const apiai = require('apiai');
const path = require('path');

// Package and API key for api.ai
const apiaiApp = apiai(process.env.API_AI);

app.set('port', (process.env.PORT || 5000));

// Mongoose Connection
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

module.exports = app;
