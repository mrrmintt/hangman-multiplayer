const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();  // app muss vor scoresRouter definiert werden

app.use(cors());
app.use(express.json());

const scoresRouter = require('./routes/scores');
app.use('/scores', scoresRouter);

mongoose.connect('mongodb://mongodb:27017/hangman');

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'db-service',
        dbConnection: mongoose.connection.readyState === 1
    });
});

const PORT = 3003;
app.listen(PORT, () => console.log(`DB service running on port ${PORT}`));