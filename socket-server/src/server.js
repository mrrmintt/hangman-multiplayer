const express = require('express');
const cors = require('cors');
const app = express();
const newGameResponses = new Map();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true,
        transports: ['websocket', 'polling']
    },
    allowEIO3: true
});
console.log('Socket server initializing...');

app.get('/health', (req, res) => {
    try {
        
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'socket-server',
            connectedClients: io.engine.clientsCount || 0,
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


const axios = require('axios');
const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://localhost:3001';
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:3002';
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
                        axios.post(`${GAME_SERVICE_URL}/games/${gameId}/reset`),
                        axios.post(`${CHAT_SERVICE_URL}/chats/${gameId}/reset`)
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
                    await axios.post(`${CHAT_SERVICE_URL}/chats/${gameId}/reset`);
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
            const response = await axios.post(`${CHAT_SERVICE_URL}/chats/${gameId}/messages`, {
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
            const response = await axios.post(`${GAME_SERVICE_URL}/games/${gameId}/guess`, {
                playerId: socket.id,
                letter
            });
    
            // Send game state update
            io.to(gameId).emit('gameStateUpdate', response.data.gameState);
    
            // Check if game is over
            if (response.data.gameState.status === 'finished' || 
                response.data.gameState.remainingGuesses <= 0) {
                
                const game = activeGames.get(gameId);
                if (game) {
                    console.log('Game Over detected, emitting to players');
                    game.players.forEach(player => {
                        io.to(player.id).emit('gameOver', {
                            result: response.data.gameState.remainingGuesses <= 0 ? 'lose' : 'win',
                            word: response.data.gameState.actualWord, // Use the actual word here
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
    
   
    socket.on('joinGame', async ({ gameId, playerName }) => {
        console.log(`Join game request from ${playerName} for game ${gameId}`);
        try {
            // Add player to game
            const response = await axios.post(`${GAME_SERVICE_URL}/games/${gameId}/players`, {
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

    // Socket for join public game
    socket.on('joinPublicGame', async ({ gameId, playerName }) => {
        console.log(`Join game request from ${playerName} for game a public game`);
        try {

            // Get to check if there are games and to check if full
            let public_games = await axios.get(`${GAME_SERVICE_URL}/public_games`)

            //create public game if there are none
            if (public_games.length== 0){
                await axios.post(`${GAME_SERVICE_URL}/public_games`)
                const gameId = gameResponse.data.gameId;
                console.log('Public Game created with ID:', gameId);
            }

            // Now there should defenetly be a public game
            public_games = await axios.get('/public_games')

            //Nicht schön!
            let public_game_id = 0;

            for (let i = 0; i < public_games.length; i++) {
                if (public_games[i].players.length < 5) {
                    public_game_id = public_games[i].id;
                    break; // Schleife abbrechen, wenn ein Spiel gefunden wurde
                }
            }

            if (public_game_id === 0) {
                // Kein Spiel gefunden, neues Spiel erstellen
                try {
                    const gameResponse = await axios.post(`${GAME_SERVICE_URL}/public_games`);
                    public_game_id = gameResponse.data.gameId;
                    console.log('Public Game created with ID:', public_game_id);
                } catch (error) {
                    console.error('Error creating a new public game:', error);
                }
            }

            console.log("Public Game id: "+ public_game_id)
            // Add player to game
            const response = await axios.post(`${GAME_SERVICE_URL}/public_games/${public_game_id}/players`, {
                playerId: socket.id,
                playerName
            });
            
            if (response.data.success) {
                // Update local game info
                const game = activeGames.get(public_game_id);
                if (game) {
                    game.players.push({id: socket.id, name: playerName});
                }
    
                socket.join(public_game_id);
                io.to(public_game_id).emit('playerJoined', {
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
            const gameResponse = await axios.post(`${GAME_SERVICE_URL}/games`);
            const gameId = gameResponse.data.gameId;
            console.log('Game created with ID:', gameId);
            
            // Store game info locally
            activeGames.set(gameId, {
                id: gameId,
                players: [{id: socket.id, name: playerName}]
            });
            
            // Create chat for this game
            console.log('Creating chat for game...');
            await axios.post(`${CHAT_SERVICE_URL}/chats`, { gameId });
            
            // Add player to game
            console.log('Adding player to game...');
            await axios.post(`${GAME_SERVICE_URL}/games/${gameId}/players`, {
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