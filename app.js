'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const _ = require('underscore');
const apiai = require('apiai');
const path = require('path');
// Package and API key for api.ai
const apiaiApp = apiai(process.env.API_AI);

app.set('port', (process.env.PORT || 5000))

// Mongoose Connection
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

//Middleware
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')));

// Index route
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
})

// Menu route
app.get('/menu', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/menu.html'));
})

// Orders route
app.get('/orders', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/orders.html'));
})

// Webhook for Facebook verification
app.get('/webhook/', function(req, res) {
    if (req.query['hub.verify_token'] === 'barista') {
        res.status(200).send(req.query['hub.challenge'])
    } else {
        res.send('Error, wrong token')
    }
})

// Run the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))

})

// Webhook to catch all messages
app.post('/webhook/', (req, res) => {
    console.log(req.body);
    if (req.body.object === 'page') {
        req.body.entry.forEach((entry) => {
            entry.messaging.forEach((event) => {
                if (event.message && event.message.text) {
                    sendMessage(event);
                }
            });
        });
        res.status(200).end();
    }
});

// Facebook Access Token
const token = process.env.FACEBOOK_TOKEN

// Send message function which passes on message to api.ai and responds to user
function sendMessage(event) {
    let sender = event.sender.id;
    let text = event.message.text;
    let apiai = apiaiApp.textRequest(text, {sessionId: sender});
    prepareForOrder(sender)
    apiai.on('response', (response) => {
        let processedText = response.result.fulfillment.speech;

        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: token
            },
            method: 'POST',
            json: {
                recipient: {
                    id: sender
                },
                message: {
                    text: processedText
                }
            }
        }, (error, response) => {
            if (error) {
                console.log('Error sending message: ', error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
            }
        });
    });

    apiai.on('error', (error) => {
        console.log(error);
    });

    apiai.end();
}
// Mongoose model for orders
var dueOrders = mongoose.model('dueOrders', {
    CustomerName: String,
    CustomerId: String,
    Total: Number,
    Order: {}
});

// Function that creates a new document for each user ID
function prepareForOrder(sender) {
    console.log(sender)
    var potentialOrder = new dueOrders({CustomerName: "Fetch name from fb", CustomerId: sender, Total: 0, Order: "", created_at: Date.now()})
    potentialOrder.save().then(function(err, result) {
        console.log('Order from - ' + sender);
    });
    // Fetch name from facebook and change the customer name
    dueOrders.findOneAndUpdate({
        CustomerId: sender
    }, {
        $set: {
            CustomerName: "Facebook Name"
        }
    }, {
        new: true
    }, function(err, doc) {
        if (err) {
            console.log("Something wrong when updating data!");
        }
        console.log(doc);
    });
}

//Products mongooose schema
var Products = mongoose.model('products', {
    Name: String,
    Price: Number,
    Size: String
});

// Endpoint to get all orders for view
app.get('/dueorders', (req, res) => {
    dueOrders.find().then((dueOrders) => {
        res.send({dueOrders});
    }, (e) => {
        res.status(400).send(e);
    })
});

// Get Data from API.AI and filter
app.post('/apiai', (req, res) => {
    if (req.body.result.action === 'order') {
        const orderData = req.body.result.parameters

        filterOrderData(orderData)
        console.log('Received an order')

    }
    res.status(200)
    setTimeout(sendOrder, 10000);

})

// Function to remove all empty values of order data
function filterOrderData(orderData) {
    var cleanOrders = _.reject(orderData, function(orders) {
        return orders === '';
    });
    console.log(cleanOrders)
    loadMenu(cleanOrders)

}

// Function to send order amount to user set to delay
function sendOrder() {
    // Get the latest order ID
    var latestOrderId = dueOrders.findOne({}, {
        sort: ('created_at')
    }, function(err, orders) {
        if (err) {
            console.log(err)
        } else {
            // Find the matching order with the latest ID
            dueOrders.findOne({
                _id: orders
            }, function(err, doc) {
                if (err) {
                    console.log("Something wrong when updating data!");
                }
                // Total is the due amount and customer ID is the facebook ID
                var billText = 'The total bill is AED ' + doc.Total + '!'
                var customerID = doc.CustomerId
                sendBill(billText, customerID)
                function sendBill(billText, customerID) {
                    request({
                        url: 'https://graph.facebook.com/v2.6/me/messages',
                        qs: {
                            access_token: token
                        },
                        method: 'POST',
                        json: {
                            recipient: {
                                id: customerID
                            },
                            message: {
                                text: billText
                            }
                        }
                    }, (error, response) => {
                        if (error) {
                            console.log('Error sending message: ', error);
                        } else if (response.body.error) {
                            console.log('Error: ', response.body.error);
                        }
                    });
                }
            });
        }
    })
}

// Loads the menu to a variable so price checking can be done
function loadMenu(cleanOrders, potentialOrder) {
    Products.find(function(err, products) {

        var newProd = products
        // Passes filtered Order with menu to price matcher
        matchPrice(cleanOrders, newProd)

    })
}

// Change to switch statement
function matchPrice(cleanOrders, newProd) {
    // Passes each order using filter
    _.filter(cleanOrders, function(order) {
        console.log(order)
        // Breaks order into each type of order
        if (order.Coffee_Type !== undefined && order.Coffee_Size !== undefined) {
            // Find when coffee type and size is listed
            var matched = _.where(newProd, {
                Name: order.Coffee_Type,
                Size: order.Coffee_Size
            })
            if (order.number !== undefined) {
                var totalBill1 = matched[0].Price * order.number
                prepareOrder(totalBill1)
            } else {
                var totalBill1 = matched[0].Price
                prepareOrder(totalBill1)
            }
        } else if (order.Coffee_Type !== undefined && order.Coffee_Size == undefined) {
            // Find when only type is specified
            var matched = _.where(newProd, {
                Name: order.Coffee_Type,
                Size: 'Grande'
            })
            if (order.number !== undefined) {
                var totalBill2 = matched[0].Price * order.number
                prepareOrder(totalBill2)
            } else {
                var totalBill2 = matched[0].Price
                prepareOrder(totalBill2)
            }
        } else if (order.Bites !== undefined && order.Coffee_Size == undefined) {
            // Find for addons and sides
            var matched = _.where(newProd, {
                Name: order.Bites,
                Size: 'Regular'
            })
            if (order.number !== undefined) {
                var totalBill3 = matched[0].Price * order.number
                prepareOrder(totalBill3)
            } else {
                var totalBill3 = matched[0].Price
                prepareOrder(totalBill3)
            }
        } else if (order.Coffee_Addons !== undefined && order.Types !== undefined) {
            // Find when Coffee addon and type are specified
            var matched = _.where(newProd, {
                Name: order.Coffee_Addons,
                Size: 'Regular'
            })
            var matched2 = _.where(newProd, {
                Name: order.Types.Coffee_Type,
                Size: order.Types.Coffee_Size
            })
            if (order.Types.number !== undefined) {
                var totalBill4 = (matched[0].Price + matched2[0].Price) * order.Types.number
                prepareOrder(totalBill4)
            } else {
                var totalBill4 = matched[0].Price + matched2[0].Price
                prepareOrder(totalBill4)
            }
        } else if (order.Coffee_Addons !== undefined && order.Quantity.number !== undefined) {
            // Find when Coffee addon and type are specified along with quantity
            var matched = _.where(newProd, {
                Name: order.Coffee_Addons,
                Size: 'Regular'
            })
            var matched2 = _.where(newProd, {
                Name: order.Quantity.Coffee_Type,
                Size: 'Grande'
            })
            if (order.Quantity.number !== undefined) {
                var totalBill4 = (matched[0].Price + matched2[0].Price) * order.Quantity.number
                prepareOrder(totalBill4)
            } else {
                var totalBill4 = matched[0].Price + matched2[0].Price
                prepareOrder(totalBill4)
            }
        }

    })
    updateOrder(cleanOrders)
}

function prepareOrder(order, totalBill1, totalBill2, totalBill3, totalBill4) {

    if (order) {
        console.log(order)
        // Passes to database to store and display to frontend
        updatePrice(order)
    } else if (totalBill1) {
        potentialOrder.total = potentialOrder.total + totalBill1
    } else if (totalBill2) {
        potentialOrder.total = potentialOrder.total + totalBill2
    } else if (totalBill3) {
        potentialOrder.total = potentialOrder.total + totalBill3
    }
}

// Update price function which gets order amounts and is run for each matching order
function updatePrice(order) {
    // Finds the nenwest order
    var latestOrderId = dueOrders.findOne({}, {
        sort: ('created_at')
    }, function(err, orders) {
        if (err) {
            console.log(err)
        } else {
            //Finds the matching order for the newest ID and increases price by the order for each product
            dueOrders.findOneAndUpdate({
                _id: orders
            }, {
                $inc: {
                    Total: order
                }
            }, {
                new: true
            }, function(err, doc) {
                if (err) {
                    console.log("Something wrong when updating data!");
                }

                console.log(doc.Total);

            });
        }
    });
}

// Updates the order data with the filtered version of the order for front end use
function updateOrder(cleanOrders) {
    var latestOrderId = dueOrders.findOne({}, {
        sort: ('created_at')
    }, function(err, orders) {
        if (err) {
            console.log(err)
        } else {
            dueOrders.findOneAndUpdate({
                _id: orders
            }, {
                $set: {
                    Order: cleanOrders
                }
            }, {
                new: true
            }, function(err, doc) {
                if (err) {
                    console.log(err);
                }
                console.log(doc);
            });
        }
    });
}

// Endpoint to get all products for view
app.get('/products', (req, res) => {
    Products.find().then((products) => {
        res.send(products);
    }, (e) => {
        res.status(400).send(e);
    })
});
