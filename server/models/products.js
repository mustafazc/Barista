var mongoose = require('mongoose');
//Products mongooose schema
var products = mongoose.model('products', {
    Name: String,
    Price: Number,
    Size: String
});

module.exports = {products};
