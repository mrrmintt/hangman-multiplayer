const express = require('express');
const path = require('path');
const { createServer } = require('./serverConfig');
const { setupSocketIO } = require('./socketSetup');

const app = express();
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = createServer(app);
setupSocketIO(server);