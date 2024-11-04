const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const Game = require('./game');
const NewGameManager = require('./newgame');
const gameManagers = new Map();


app.use(express.static('public'));

const games = new Map(); // gameId -> game state

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    let currentGameId = null;


    


    socket.on('requestNewGame', ({ gameId }) => {
        const game = games.get(gameId);
        if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }

        let gameManager = gameManagers.get(gameId);
        if (!gameManager) {
            gameManager = new NewGameManager(game);
            gameManagers.set(gameId, gameManager);
        }

        const result = gameManager.requestNewGame(socket.id);
        if (result.success) {
            // Find the other player
            const otherPlayer = game.players.find(p => p.id !== socket.id);
            if (otherPlayer) {
                io.to(otherPlayer.id).emit('newGameRequested', {
                    requestedBy: game.players.find(p => p.id === socket.id).name
                });
            }
        } else {
            socket.emit('error', { message: result.message });
        }
    });
    socket.on('newGameResponse', ({ gameId, accepted }) => {
        const gameManager = gameManagers.get(gameId);
        if (!gameManager) {
            socket.emit('error', { message: 'Game manager not found' });
            return;
        }

        const result = gameManager.handleResponse(socket.id, accepted);
        if (result.success) {
            if (result.result === 'accepted') {
                io.to(gameId).emit('newGameStarted', { 
                    message: 'Starting new game!',
                    gameState: result.gameState 
                });
            } else {
                io.to(gameId).emit('returnToMenu', { 
                    message: 'New game rejected. Returning to menu...' 
                });
            }
        } else {
            socket.emit('error', { message: result.message });
        }
    });







    socket.on('createGame', ({ playerName }) => {
        const gameId = Math.random().toString(36).substring(2, 8);
        const game = new Game(gameId);
        const result = game.addPlayer(socket.id, playerName);
        
        if (result.success) {
            games.set(gameId, game);
            currentGameId = gameId;
            socket.join(gameId);
            socket.emit('gameCreated', { 
                gameId,
                message: 'Waiting for another player to join...'
            });
            io.to(gameId).emit('gameStateUpdate', game.getGameState());
        } else {
            socket.emit('error', { message: result.message });
        }
    });

    socket.on('joinGame', ({ gameId, playerName }) => {
        const game = games.get(gameId);
        if (!game) {
            socket.emit('error', { message: 'Game not found. Please check the game ID.' });
            return;
        }

        const result = game.addPlayer(socket.id, playerName);
        if (result.success) {
            currentGameId = gameId;
            socket.join(gameId);
            io.to(gameId).emit('playerJoined', { 
                message: `${playerName} joined the game!`,
                gameState: game.getGameState()
            });
        } else {
            socket.emit('error', { message: result.message });
        }
    });

    socket.on('makeGuess', ({ gameId, letter }) => {
        const game = games.get(gameId);
        if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }

        if (game.status !== 'playing') {
            socket.emit('error', { message: 'Game is not in playing state' });
            return;
        }

        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== socket.id) {
            socket.emit('error', { message: "It's not your turn" });
            return;
        }

        const result = game.makeGuess(letter);
        if (result === 'invalid') {
            socket.emit('error', { message: 'Letter already guessed' });
            return;
        }

        io.to(gameId).emit('gameStateUpdate', game.getGameState());
        
        if (result === 'win' || result === 'lose') {
            game.players.forEach(player => {
                io.to(player.id).emit('gameOver', { 
                    result, 
                    word: game.word,
                    isHost: player.id === game.players[0].id  // Add this line
                });
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (currentGameId) {
            const game = games.get(currentGameId);
            if (game && game.removePlayer(socket.id)) {
                io.to(currentGameId).emit('playerLeft', {
                    message: 'Other player left the game',
                    gameState: game.getGameState()
                });
            }
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});