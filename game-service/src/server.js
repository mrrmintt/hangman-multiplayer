const express = require('express');
const cors = require('cors');
const Game = require('./game');  // Make sure this path is correct!
const app = express();

app.use(cors());
app.use(express.json());

const games = new Map();
const gameManagers = new Map();

app.post('/games', (req, res) => {
    try {
        console.log('New game request received');
        const gameId = Math.random().toString(36).substring(2, 8);
        const game = new Game(gameId);
        games.set(gameId, game);
        console.log('Created game with ID:', gameId);
        res.json({ gameId });
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/games/:gameId/players', (req, res) => {
    try {
        const { gameId } = req.params;
        const { playerId, playerName } = req.body;
        
        console.log(`Adding player ${playerName} to game ${gameId}`);
        
        const game = games.get(gameId);
        if (!game) {
            return res.status(404).json({ 
                success: false, 
                message: 'Game not found' 
            });
        }
        
        const result = game.addPlayer(playerId, playerName);
        if (result.success) {
            console.log(`Successfully added player ${playerName}`);
            // Include game state in the response
            res.json({
                success: true,
                gameState: game.getGameState()
            });
        } else {
            console.log(`Failed to add player: ${result.message}`);
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('Error adding player:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});
app.post('/games/:gameId/reset', (req, res) => {
    try {
        const { gameId } = req.params;
        const game = games.get(gameId);
        
        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        // Reset game state
        game.word = game.getRandomWord();
        game.guessedLetters = new Set();
        game.remainingGuesses = 8;
        game.currentPlayerIndex = 0;
        game.status = 'playing';

        const gameState = game.getGameState();
        res.json({ success: true, gameState });
    } catch (error) {
        console.error('Error resetting game:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
app.post('/games/:gameId/guess', (req, res) => {
    try {
        const { gameId } = req.params;
        const { playerId, letter } = req.body;
        console.log(`Guess attempt in game ${gameId}: Letter ${letter} by player ${playerId}`);

        const game = games.get(gameId);
        if (!game) {
            return res.status(404).json({ 
                success: false, 
                message: 'Game not found' 
            });
        }

        // Verify it's the player's turn
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== playerId) {
            return res.status(400).json({ 
                success: false, 
                message: "It's not your turn" 
            });
        }

        // Make the guess
        const result = game.makeGuess(letter);
        const gameState = game.getGameState();

        // Handle game over states properly
        if (result === 'win' || result === 'lose') {
            return res.json({
                success: true,
                result,
                gameState,
                isGameOver: true,
                word: game.word  // Send the full word when game is over
            });
        }

        // Normal turn response
        res.json({
            success: true,
            result,
            gameState,
            isGameOver: false
        });

    } catch (error) {
        console.error('Error processing guess:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Game service running on port ${PORT}`);
});