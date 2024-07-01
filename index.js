const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes');

const app = express();
app.use(bodyParser.json());
app.use(cors({
    origin: '*', // Cambia esto al origen correcto si es necesario
    methods: ['GET', 'POST','PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));
app.use('/api', routes);

app.listen(3000);
console.log('Server on port 3000');
