const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    gameId: String,
    playerName: String,
    score: Number,
    playDate: { type: Date, default: Date.now },
    isWinner: { type: Boolean, default: false }
});

module.exports = mongoose.model('Score', scoreSchema);