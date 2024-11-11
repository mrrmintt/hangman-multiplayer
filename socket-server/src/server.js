const express = require('express');
const cors = require('cors');
const app = express();
const newGameResponses = new Map();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:80",
        methods: ["GET", "POST"],
        credentials: true,
        transports: ['websocket', 'polling']
    }
});
console.log('Socket server initializing...');

const axios = require('axios');
const activeGames = new Map();
app.use(cors({
    origin: "http://localhost:80",
    credentials: true
}));

io.on('connection', (socket) => {
    console.log('Client connected with ID:', socket.id);
    socket.on('requestNewGame', ({ gameId }) => {
        console.log(`New game request from ${socket.id} for game ${gameId}`);
        const game = activeGames.get(gameId);
        if (game) {
            // Send request to all players except the requester
            game.players.forEach(player => {
                if (player.id !== socket.id) {
                    console.log(`Sending new game request to player ${player.id}`);
                    io.to(player.id).emit('newGameRequested', {
                        requestedBy: game.players.find(p => p.id === socket.id).name
                    });
                }
            });
        }
    });
   
    socket.on('newGameResponse', async ({ gameId, accepted }) => {
        console.log(`New game response from ${socket.id} for game ${gameId}: ${accepted}`);
        const game = activeGames.get(gameId);
        
        if (!game) return;

        // Initialize responses tracking if needed
        if (!newGameResponses.has(gameId)) {
            newGameResponses.set(gameId, new Map());
        }
        const responses = newGameResponses.get(gameId);
        responses.set(socket.id, accepted);

        // Check if we have all responses (excluding the host)
        const requiredResponses = game.players.length - 1; // -1 for host
        const currentResponses = responses.size;

        console.log(`Received ${currentResponses} out of ${requiredResponses} required responses`);

        if (currentResponses >= requiredResponses) {
            // Check if all players accepted 
            const allAccepted = Array.from(responses.values()).every(response => response);

            if (allAccepted) {
                console.log('All players accepted, starting new game');
                try {
                    // Reset both game and chat in parallel
                    const [gameResponse, chatResponse] = await Promise.all([
                        axios.post(`http://localhost:3001/games/${gameId}/reset`),
                        axios.post(`http://localhost:3002/chats/${gameId}/reset`)
                    ]);

                    console.log('Game and chat reset successfully');
                    io.to(gameId).emit('newGameStarted', {
                        message: 'All players accepted! Starting new game!',
                        gameState: gameResponse.data.gameState
                    });
                    // Clear responses for this game
                    newGameResponses.delete(gameId);
                } catch (error) {
                    console.error('Error resetting game or chat:', error);
                    io.to(gameId).emit('error', { 
                        message: 'Failed to start new game: ' + error.message 
                    });
                }
            } else {
                console.log('Some players declined, returning to menu');
                try {
                    // Reset chat when returning to menu
                    await axios.post(`http://localhost:3002/chats/${gameId}/reset`);
                    io.to(gameId).emit('returnToMenu', {
                        message: 'New game rejected. Returning to menu...'
                    });
                    // Clean up
                    newGameResponses.delete(gameId);
                    activeGames.delete(gameId);
                } catch (error) {
                    console.error('Error resetting chat:', error);
                    io.to(gameId).emit('error', { 
                        message: 'Error cleaning up game: ' + error.message 
                    });
                }
            }
        }
    });
    socket.on('chatMessage', async ({ gameId, message, playerName }) => {
        console.log(`Chat message from ${playerName} in game ${gameId}: ${message}`);
        try {
            const response = await axios.post(`http://localhost:3002/chats/${gameId}/messages`, {
                username: playerName,
                message: message
            });

            if (response.data) {
                // Broadcast message to all players in the game
                io.to(gameId).emit('chatMessage', response.data);
            }
        } catch (error) {
            console.error('Error sending chat message:', error);
            socket.emit('error', { message: 'Failed to send chat message' });
        }
    });
    socket.on('makeGuess', async ({ gameId, letter }) => {
        console.log(`Guess attempt from ${socket.id}: Letter ${letter} in game ${gameId}`);
        try {
            const response = await axios.post(`http://localhost:3001/games/${gameId}/guess`, {
                playerId: socket.id,
                letter
            });

            io.to(gameId).emit('gameStateUpdate', response.data.gameState);

            if (response.data.result === 'win' || response.data.result === 'lose') {
                const game = activeGames.get(gameId);
                if (game) {
                    game.players.forEach(player => {
                        io.to(player.id).emit('gameOver', {
                            result: response.data.result,
                            word: response.data.word,
                            isHost: player.id === game.players[0].id
                        });
                    });
                }
            }
        } catch (error) {
            console.error('Error making guess:', error);
            socket.emit('error', { 
                message: error.response?.data?.message || 'Error making guess'
            });
        }
    });
    
    socket.on('disconnect', (reason) => {
        console.log(`Client ${socket.id} disconnected. Reason: ${reason}`);
    });
    socket.on('joinGame', async ({ gameId, playerName }) => {
        console.log(`Join game request from ${playerName} for game ${gameId}`);
        try {
            // Add player to game
            const response = await axios.post(`http://localhost:3001/games/${gameId}/players`, {
                playerId: socket.id,
                playerName
            });

            if (response.data.success) {
                // Update local game info
                const game = activeGames.get(gameId);
                if (game) {
                    game.players.push({id: socket.id, name: playerName});
                }

                socket.join(gameId);
                io.to(gameId).emit('playerJoined', {
                    message: `${playerName} joined the game!`,
                    gameState: response.data.gameState
                });
            }
        } catch (error) {
            socket.emit('error', { 
                message: error.response?.data?.message || 'Failed to join game'
            });
        }
    });
    socket.on('createGame', async ({ playerName }) => {
        console.log(`Create game request from ${playerName} (${socket.id})`);
        try {
            // Create game via Game Service
            console.log('Attempting to create game on game service...');
            const gameResponse = await axios.post('http://localhost:3001/games');
            const gameId = gameResponse.data.gameId;
            console.log('Game created with ID:', gameId);
            
            // Store game info locally
            activeGames.set(gameId, {
                id: gameId,
                players: [{id: socket.id, name: playerName}]
            });
            
            // Create chat for this game
            console.log('Creating chat for game...');
            await axios.post('http://localhost:3002/chats', { gameId });
            
            // Add player to game
            console.log('Adding player to game...');
            await axios.post(`http://localhost:3001/games/${gameId}/players`, {
                playerId: socket.id,
                playerName
            });
            
            socket.join(gameId);
            console.log('Emitting gameCreated event...');
            socket.emit('gameCreated', { 
                gameId,
                message: 'Waiting for other players to join...'
            });
        } catch (error) {
            console.error('Error creating game:', error.message);
            socket.emit('error', { 
                message: 'Failed to create game: ' + error.message 
            });
        }
    });
    
    socket.on('disconnect', (reason) => {
        console.log(`Client ${socket.id} disconnected. Reason: ${reason}`);
    });
});

const PORT = 3000;
http.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT}`);
});