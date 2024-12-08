const express = require('express');
const cors = require('cors');
const Game = require('./game');  
const app = express();

const axios = require('axios');
const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:3003';

app.use(cors());
app.use(express.json());

const games = new Map();
const gameManagers = new Map();
app.get('/health', (req, res) => {
    try {
        
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'game-service',
            activeGames: games.size,
            uptime: Math.round(process.uptime()) + ' seconds'
        };
        res.status(200).json(healthStatus);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});
async function saveScore(gameId, playerName, score) {
    try {
        await axios.post(`${DB_SERVICE_URL}/scores`, {
            gameId,
            playerName,
            score
        });
    } catch (error) {
        console.error('Error saving score:', error);
    }
}
// Helper function to save game scores
async function saveGameScores(gameId, players) {
    try {
        for (const player of players) {
            await saveScore(gameId, player.name, player.score || 0);
        }
    } catch (error) {
        console.error('Error saving game scores:', error);
    }

}

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

app.post('/games/:gameId/players', async (req, res) => {
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
            
            // If this is the third player, save initial scores
            if (game.players.length === 3) {
                console.log('Third player joined, saving initial scores');
                await saveGameScores(gameId, game.players);
            }

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

app.post('/games/:gameId/guess', async (req, res) => {
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

        // Speichere Punkte für erfolgreichen Versuch
        // Entferne oder ändere diesen Teil:
        if (result.score > 0) {
            await axios.post(`${DB_SERVICE_URL}/scores`, {
                gameId,
                playerName: currentPlayer.name,
                score: result.score,
                playDate: new Date(),
                isWinner: false  // Normale Punkte sind keine Gewinner
            });
        }

        
        // Handle game over states and save final scores
        if (result.result === 'win' || result.result === 'lose') {
            console.log('Game over, saving final scores');
            const sortedPlayers = gameState.players.sort((a, b) => 
                (b.score || 0) - (a.score || 0)
            );
            
            // Speichere Gewinner
            if (sortedPlayers.length > 0) {
                const winnerData = {
                    gameId,
                    playerName: sortedPlayers[0].name,
                    score: sortedPlayers[0].score || 0,
                    playDate: new Date(),
                    isWinner: true
                };
                console.log('Saving winner data:', winnerData);
                
                try {
                    const response = await axios.post(`${DB_SERVICE_URL}/scores`, winnerData);
                    console.log('Winner saved:', response.data);
                } catch (error) {
                    console.error('Error saving winner:', error);
                }
            }
            
            return res.json({
                success: true,
                result: result.result,
                gameState,
                isGameOver: true,
                word: game.word,
                winner: sortedPlayers[0],
                finalScores: sortedPlayers
            });
        }

        
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

// New endpoint to get game scores
app.get('/games/:gameId/scores', async (req, res) => {
    try {
        const { gameId } = req.params;
        const response = await axios.get(`${DB_SERVICE_URL}/scores/${gameId}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error getting game scores:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Game service running on port ${PORT}`);
});