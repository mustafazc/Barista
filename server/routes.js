const express = require('express');
const app = express();
const routes = require('express').Router();
const bodyParser = require('body-parser');
const path = require('path');

//Middleware
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/../public')));

// Index route
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

// Menu route
app.get('/menu', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/menu.html'));
});

// Orders route
app.get('/orders', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/orders.html'));
});

// Endpoint to get all products for view
app.get('/products', (req, res) => {
    products.find().then((products) => {
        res.send(products);
    }, (e) => {
        res.status(400).send(e);
    });
});

// Webhook for Facebook verification
app.get('/webhook', function(req, res)  {
    if (req.query['hub.verify_token'] === 'barista') {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.send('Error, wrong token');
    }
});


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

// Endpoint to get all orders for view
app.get('/dueorders', (req, res) => {
    dueOrders.find().then((dueOrders) => {
        res.send({dueOrders});
    }, (e) => {
        res.status(400).send(e);
    });
});

// Get Data from API.AI and filter
app.post('/apiai', (req, res) => {
    if (req.body.result.action === 'order') {
        const orderData = req.body.result.parameters;

        filterOrderData(orderData);
        console.log('Received an order');
    }
    res.status(200);
    setTimeout(sendOrder, 10000);

});

module.exports = {app};
