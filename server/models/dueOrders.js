var mongoose = require('mongoose');
// Mongoose model for orders
var dueOrders = mongoose.model('dueOrders', {
    CustomerName: String,
    CustomerId: String,
    Total: Number,
    Order: {}
});

module.exports = {dueOrders};
