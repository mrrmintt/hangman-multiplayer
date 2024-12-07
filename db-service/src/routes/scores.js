const express = require('express');
const router = express.Router();
const Score = require('../models/score');

// Get all scores
router.get('/', async (req, res) => {
    try {
        const scores = await Score.find().sort({ score: -1 });
        res.json(scores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get scores by gameId
router.get('/:gameId', async (req, res) => {
    try {
        const scores = await Score.find({ gameId: req.params.gameId });
        res.json(scores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save new score
router.post('/', async (req, res) => {
    try {
        const { gameId, playerName, score } = req.body;
        
        // Finde existierenden Score und update ihn
        const existingScore = await Score.findOne({ gameId, playerName });
        if (existingScore) {
            existingScore.score += score;  // Score addieren
            await existingScore.save();
            res.json(existingScore);
        } else {
            // Neuen Score erstellen
            const newScore = new Score({ gameId, playerName, score });
            await newScore.save();
            res.json(newScore);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete score
router.delete('/:id', async (req, res) => {
    try {
        await Score.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get winners of the day
router.get('/daily-winners', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const winners = await Score.find({
            playDate: { $gte: today },
            isWinner: true
        })
        .sort('-score')
        .limit(10);
        
        res.json(winners);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;