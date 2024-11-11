console.log('Client script loading...');

const socket = io('http://localhost:3000', {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

console.log('Socket initialized');

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

socket.on('connect_timeout', () => {
    console.error('Socket connection timeout');
});





let playerName = '';
let currentGameId = '';

// Initialize game UI
function initializeGame() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const lettersDiv = document.getElementById('letters');
    letters.forEach(letter => {
        const button = document.createElement('button');
        button.textContent = letter;
        button.onclick = () => makeGuess(letter);
        lettersDiv.appendChild(button);
    });
}

function showStatus(message, type = 'info') {
    console.log('Status:', message, type); // Debug log
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = type;
}

function createGame() {
    console.log('Create game clicked');
    playerName = document.getElementById('player-name').value.trim();
    if (!playerName) {
        showStatus('Please enter your name', 'error');
        return;
    }
    resetChat(); // Reset chat when creating new game
    socket.emit('createGame', { playerName });
}

function joinGame() {
    console.log('Join game clicked');
    playerName = document.getElementById('player-name').value.trim();
    const gameId = document.getElementById('game-id').value.trim();
    if (!playerName || !gameId) {
        showStatus('Please enter your name and game ID', 'error');
        return;
    }
    resetChat(); // Reset chat when joining game
    currentGameId = gameId;
    socket.emit('joinGame', { gameId, playerName });
}

function makeGuess(letter) {
    if (!currentGameId) {
        showStatus('No active game found', 'error');
        return;
    }
    console.log(`Making guess: ${letter} in game: ${currentGameId}`);
    socket.emit('makeGuess', { gameId: currentGameId, letter });
}

// Chat functions
function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (message) {
        console.log('Sending chat message:', message);
        socket.emit('chatMessage', {
            gameId: currentGameId,
            message: message,
            playerName: playerName
        });
        chatInput.value = ''; // Clear input after sending
    }
}

function displayChatMessage(message) {
    console.log('Displaying chat message:', message);
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    messageDiv.innerHTML = `
        <span class="chat-timestamp">[${message.timestamp}]</span>
        <span class="chat-username">${message.username}:</span>
        <span class="chat-text">${message.message}</span>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
}


function resetChat() {
    console.log('Resetting chat');
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = ''; // Clear all messages
    document.getElementById('chat-input').value = ''; // Clear input field
}

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to socket server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
});

socket.on('gameCreated', (data) => {
    console.log('Game created event received:', data); // Debug log
    currentGameId = data.gameId;
    console.log('Setting game ID:', currentGameId); // Debug log
    
    // Hide menu and show game container
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    
    // Update game ID display
    document.getElementById('current-game-id').textContent = currentGameId;
    
    // Show waiting message
    showStatus(data.message || 'Waiting for other players...', 'info');
    
    console.log('UI updated for new game'); // Debug log
});

socket.on('error', ({ message }) => {
    console.error('Game error:', message);
    showStatus(message, 'error');
});

socket.on('gameStateUpdate', (gameState) => {
    console.log('Received game state update:', gameState);
    updateGameState(gameState);
});
socket.on('playerJoined', ({ message, gameState }) => {
    console.log('Player joined:', message); // Debug log
    showStatus(message, 'success');
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('current-game-id').textContent = currentGameId;
    updateGameState(gameState);
});

socket.on('playerLeft', ({ message, gameState }) => {
    showStatus(message, 'error');
    updateGameState(gameState);
});

socket.on('chatMessage', (message) => {
    console.log('Received chat message:', message);
    displayChatMessage(message);
});

socket.on('newGameRequested', ({ requestedBy }) => {
    console.log('New game requested by:', requestedBy);
    const confirmDiv = document.getElementById('new-game-confirm');
    confirmDiv.style.display = 'block';
    document.getElementById('confirm-message').textContent = 
        `${requestedBy} wants to start a new game. Do you accept?`;
});

socket.on('newGameStarted', ({ message, gameState }) => {
    console.log('Starting new game with state:', gameState);
    showStatus(message, 'success');
    updateGameState(gameState);
    hideNewGameElements();
    resetChat(); // Reset chat for new game
});
socket.on('returnToMenu', ({ message }) => {
    console.log('Returning to menu:', message);
    showStatus(message, 'info');
    setTimeout(() => {
        document.getElementById('menu').style.display = 'block';
        document.getElementById('game-container').style.display = 'none';
        hideNewGameElements();
        resetChat(); // Reset chat when returning to menu
    }, 2000);
});
socket.on('gameOver', ({ result, word, isHost }) => {
    console.log('Game over:', result, word, 'Is host:', isHost);
    const message = result === 'win' ? 
        `Congratulations! You've won! The word was: ${word}` :
        `Game Over! The word was: ${word}`;
    showStatus(message, result === 'win' ? 'success' : 'error');

    // Show new game button only to the first player (host)
    if (isHost) {
        console.log('Showing new game button to host');
        document.getElementById('request-new-game').style.display = 'block';
    }
});
function requestNewGame() {
    console.log('Requesting new game for:', currentGameId);
    socket.emit('requestNewGame', { gameId: currentGameId });
    // Hide the request button after clicking
    document.getElementById('request-new-game').style.display = 'none';
}
function respondToNewGame(accepted) {
    console.log('Responding to new game request:', accepted);
    socket.emit('newGameResponse', { gameId: currentGameId, accepted });
    document.getElementById('new-game-confirm').style.display = 'none';
}

function hideNewGameElements() {
    document.getElementById('new-game-confirm').style.display = 'none';
    document.getElementById('request-new-game').style.display = 'none';
}
function updateGameState(gameState) {
    // Update the word display
    document.getElementById('word').textContent = gameState.word;
    
    // Update remaining guesses
    document.getElementById('guesses').textContent = gameState.remainingGuesses;
    
    // Update current player
    const currentPlayerName = gameState.currentPlayer ? gameState.currentPlayer.name : 'Waiting...';
    document.getElementById('current-player').textContent = currentPlayerName;
    
    // Update letter buttons
    const buttons = document.getElementById('letters').getElementsByTagName('button');
    Array.from(buttons).forEach(button => {
        // Disable if letter was already guessed or it's not player's turn
        button.disabled = 
            gameState.guessedLetters.includes(button.textContent) ||
            (gameState.currentPlayer && gameState.currentPlayer.id !== socket.id) ||
            gameState.status !== 'playing';
            
        // Add 'used' class to guessed letters
        button.classList.toggle('used', 
            gameState.guessedLetters.includes(button.textContent));
    });

    // Update players list
    const playersContainer = document.getElementById('players-container');
    playersContainer.innerHTML = '';
    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player-item ${player.id === gameState.currentPlayer?.id ? 'current-player' : ''}`;
        playerDiv.textContent = `${player.name}${player.id === gameState.currentPlayer?.id ? ' (Current Turn)' : ''}`;
        playersContainer.appendChild(playerDiv);
    });
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initializeGame);
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
});
// Add chat enter key handler
document.getElementById('chat-input').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
});