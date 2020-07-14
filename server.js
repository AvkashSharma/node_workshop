// import config file
const config = require('./config');

// import built-in Node packages
const express = require('express'); // import express
const server = express();
const body_parser = require('body-parser');
server.use(body_parser.json()); // parse JSON (application/json content-type)

// allow CORS
const cors = require('cors')
server.use(cors())

// import routers
const productsRouter = require('./routes/api/products');
const usersRouter = require('./routes/api/users');
const foodsRouter = require('./routes/api/foods');

// import routers for HTML views (pages)
const indexPages = require('./routes/pages/index');
const productsPages = require('./routes/pages/products');

const port = config.port || 4000;

// ### HTML routes ###
server.use("/", indexPages);
server.use("/", productsPages);

// ### JSON routes ### 
server.get("/json", (req, res) => {
	res.send((JSON.stringify({ name: "Lenny" })));
});

// # Products REST API
server.use("/", productsRouter);

// # Foods REST API
server.use("/", foodsRouter);

// # Users REST API
server.use("/", usersRouter);

server.listen(port, () => { // Callback function in ES6
	console.log(`Server listening at ${port}`);
});
