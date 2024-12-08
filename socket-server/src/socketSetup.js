const socketIO = require('socket.io');
const { 
    handleConnection, 
    handleCreateGame, 
    handleJoinGame 
} = require('./socketHandlers');


//Hier noch was machen????
function setupSocketIO(server) {
    const io = socketIO(server, {
        cors: {
            origin: "http://localhost:80", // Allow client service to connect
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    
    io.on('connection', (socket) => {
        const { setCurrentGameId } = handleConnection(io, socket);
        
        socket.on('createGame', ({ playerName }) => {
            const gameId = handleCreateGame(io, socket, { playerName });
            if (gameId) setCurrentGameId(gameId);
        });

        socket.on('joinGame', ({ gameId, playerName }) => {
            const joinedGameId = handleJoinGame(io, socket, { gameId, playerName });
            if (joinedGameId) setCurrentGameId(joinedGameId);
        });
    });

    return io;
}

module.exports = { setupSocketIO };