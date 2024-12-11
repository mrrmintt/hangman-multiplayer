//Score management router handling winners tracking and CRUD operations.
const express = require('express');
const router = express.Router();
const Score = require('../models/score');
router.get('/daily-winners', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        
        console.log('Searching for winners since:', today);
        
        const winners = await Score.find({
            playDate: { $gte: today },
            isWinner: true
        })
        .sort('-score')
        .limit(10);
        
       // console.log('Found winners:', winners);
        
        res.json(winners);
    } catch (error) {
        console.error('Error getting daily winners:', error);
        res.status(500).json({ error: error.message });
    }
});
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
        console.log('Received score data:', req.body); // Debug log
        
        const { gameId, playerName, score, playDate, isWinner } = req.body;
        
        const scoreData = {
            gameId,
            playerName,
            score: score || 0,
            playDate: playDate || new Date(),
            isWinner: isWinner || false
        };

        console.log('Creating score with data:', scoreData); // Debug log

        const newScore = new Score(scoreData);
        await newScore.save();
        
        console.log('Score saved:', newScore); // Debug log
        res.json(newScore);
    } catch (error) {
        console.error('Error saving score:', error);
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

module.exports = router;