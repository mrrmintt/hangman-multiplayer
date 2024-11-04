const socket = io();
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
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = type;
}

function createGame() {
    playerName = document.getElementById('player-name').value.trim();
    if (!playerName) {
        showStatus('Please enter your name', 'error');
        return;
    }
    socket.emit('createGame', { playerName });
}

function joinGame() {
    playerName = document.getElementById('player-name').value.trim();
    const gameId = document.getElementById('game-id').value.trim();
    if (!playerName || !gameId) {
        showStatus('Please enter your name and game ID', 'error');
        return;
    }
    currentGameId = gameId;
    socket.emit('joinGame', { gameId, playerName });
}

function makeGuess(letter) {
    socket.emit('makeGuess', { gameId: currentGameId, letter });
}




function requestNewGame() {
    socket.emit('requestNewGame', { gameId: currentGameId });
    document.getElementById('request-new-game').style.display = 'none';
}

function respondToNewGame(accepted) {
    socket.emit('newGameResponse', { gameId: currentGameId, accepted });
    document.getElementById('new-game-confirm').style.display = 'none';
}

function hideNewGameElements() {
    document.getElementById('new-game-confirm').style.display = 'none';
    document.getElementById('request-new-game').style.display = 'none';
}





function updateGameState(gameState) {
    document.getElementById('word').textContent = gameState.word;
    document.getElementById('guesses').textContent = gameState.remainingGuesses;
    
    const currentPlayerName = gameState.currentPlayer ? gameState.currentPlayer.name : 'Waiting...';
    document.getElementById('current-player').textContent = currentPlayerName;

    const buttons = document.getElementById('letters').getElementsByTagName('button');
    Array.from(buttons).forEach(button => {
        button.classList.toggle('used', 
            gameState.guessedLetters.includes(button.textContent));
        button.disabled = 
            gameState.guessedLetters.includes(button.textContent) ||
            (gameState.currentPlayer && gameState.currentPlayer.id !== socket.id) ||
            gameState.status !== 'playing';
    });
}

// Socket event handlers
socket.on('gameCreated', ({ gameId, message }) => {
    currentGameId = gameId;
    document.getElementById('current-game-id').textContent = gameId;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    showStatus(message, 'info');
});




socket.on('newGameRequested', ({ requestedBy }) => {
    const confirmDiv = document.getElementById('new-game-confirm');
    confirmDiv.style.display = 'block';
    document.getElementById('confirm-message').textContent = 
        `${requestedBy} wants to start a new game. Do you accept?`;
});
socket.on('newGameStarted', ({ message, gameState }) => {
    showStatus(message, 'success');
    updateGameState(gameState);
    hideNewGameElements();
});

socket.on('returnToMenu', ({ message }) => {
    showStatus(message, 'info');
    setTimeout(() => {
        document.getElementById('menu').style.display = 'block';
        document.getElementById('game-container').style.display = 'none';
        hideNewGameElements();
    }, 2000);
});





socket.on('playerJoined', ({ message, gameState }) => {
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

socket.on('gameStateUpdate', updateGameState);

// In client.js, modify the gameOver event handler:
socket.on('gameOver', ({ result, word, isHost }) => {
    const message = result === 'win' ? 
        `Congratulations! You've won! The word was: ${word}` :
        `Game Over! The word was: ${word}`;
    showStatus(message, result === 'win' ? 'success' : 'error');
    
    // Show new game button only to the host
    if (isHost) {
        document.getElementById('request-new-game').style.display = 'block';
    }
});

socket.on('error', ({ message }) => {
    showStatus(message, 'error');
});

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initializeGame);