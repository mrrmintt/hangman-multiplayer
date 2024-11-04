const Game = require('./game');
const NewGameManager = require('./newgame');
const Chat = require('./chat');

const gameManagers = new Map();
const games = new Map();
const chats = new Map();

function handleConnection(io, socket) {
    console.log('User connected:', socket.id);
    let currentGameId = null;

    socket.on('requestNewGame', (data) => handleRequestNewGame(io, socket, data));
    socket.on('newGameResponse', (data) => handleNewGameResponse(io, socket, data));
    socket.on('makeGuess', (data) => handleMakeGuess(io, socket, data));
    socket.on('chatMessage', (data) => handleChatMessage(io, socket, data));
    socket.on('disconnect', () => handleDisconnect(io, socket, currentGameId));

    return {
        currentGameId,
        setCurrentGameId: (id) => { currentGameId = id; }
    };
}

function handleChatMessage(io, socket, { gameId, message, playerName }) {
    const chat = chats.get(gameId);
    if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
    }

    const newMessage = chat.addMessage(playerName, message);
    io.to(gameId).emit('chatMessage', newMessage);
}

function handleCreateGame(io, socket, { playerName }) {
    const gameId = Math.random().toString(36).substring(2, 8);
    const game = new Game(gameId);
    const result = game.addPlayer(socket.id, playerName);
    
    if (result.success) {
        games.set(gameId, game);
        
        chats.set(gameId, new Chat());
        socket.join(gameId);
        socket.emit('gameCreated', { 
            gameId,
            message: 'Waiting for another player to join...'
        });
        io.to(gameId).emit('gameStateUpdate', game.getGameState());
        return gameId;
    } else {
        socket.emit('error', { message: result.message });
        return null;
    }
}

function handleJoinGame(io, socket, { gameId, playerName }) {
    const game = games.get(gameId);
    if (!game) {
        socket.emit('error', { message: 'Game not found. Please check the game ID.' });
        return null;
    }

    const result = game.addPlayer(socket.id, playerName);
    if (result.success) {
        socket.join(gameId);
        io.to(gameId).emit('playerJoined', { 
            message: `${playerName} joined the game!`,
            gameState: game.getGameState()
        });
        return gameId;
    } else {
        socket.emit('error', { message: result.message });
        return null;
    }
}

function handleRequestNewGame(io, socket, { gameId }) {
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
        const otherPlayer = game.players.find(p => p.id !== socket.id);
        if (otherPlayer) {
            io.to(otherPlayer.id).emit('newGameRequested', {
                requestedBy: game.players.find(p => p.id === socket.id).name
            });
        }
    } else {
        socket.emit('error', { message: result.message });
    }
}

function handleNewGameResponse(io, socket, { gameId, accepted }) {
    const gameManager = gameManagers.get(gameId);
    if (!gameManager) {
        socket.emit('error', { message: 'Game manager not found' });
        return;
    }

    const result = gameManager.handleResponse(socket.id, accepted);
    if (result.success) {
        if (result.result === 'accepted') {
            // Reset chat for new game
            chats.set(gameId, new Chat());
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
}

function handleMakeGuess(io, socket, { gameId, letter }) {
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
                isHost: player.id === game.players[0].id
            });
        });
    }
}

function handleDisconnect(io, socket, currentGameId) {
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
}

module.exports = {
    handleConnection,
    handleCreateGame,
    handleJoinGame,
    games
};