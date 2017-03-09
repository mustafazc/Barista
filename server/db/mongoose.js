require('dotenv').config();

// Mongoose Connection
var mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI);

module.exports = {mongoose};
