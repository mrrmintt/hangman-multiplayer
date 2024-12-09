const socketIO = require('socket.io');
const { 
    handleConnection, 
    handleCreateGame, 
    handleJoinGame 
} = require('./socketHandlers');



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

        socket.on('joinPublicGame', ({ playerName }) => {
            const joinedGameId = handleJoinPublicGame(io, socket, { playerName });
            if (joinedGameId) {
                setCurrentGameId(joinedGameId);
            }
        });        
    });






    return io;
}

module.exports = { setupSocketIO };