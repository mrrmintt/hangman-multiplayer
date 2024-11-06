const socket = io();
let playerName = '';
let currentGameId = '';

// init
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
    resetChat(); 
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
    resetChat();
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

function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (message) {
        socket.emit('chatMessage', {
            gameId: currentGameId,
            message: message,
            playerName: playerName
        });
        chatInput.value = '';
    }
}
function displayChatMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `
        <span class="chat-timestamp">[${message.timestamp}]</span>
        <span class="chat-username">${message.username}:</span>
        <span class="chat-text">${message.message}</span>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
function resetChat() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = ''; // Clear all chats + input field
    document.getElementById('chat-input').value = ''; 
}
function updatePendingResponses(received, total) {
    const pendingDiv = document.getElementById('pending-responses');
    if (received < total) {
        pendingDiv.style.display = 'block';
        pendingDiv.textContent = `Waiting for responses... (${received}/${total})`;
    } else {
        pendingDiv.style.display = 'none';
    }
}
function updateGameState(gameState) {
    document.getElementById('word').textContent = gameState.word;
    document.getElementById('guesses').textContent = gameState.remainingGuesses;
    
    const currentPlayerName = gameState.currentPlayer ? gameState.currentPlayer.name : 'Waiting...';
    document.getElementById('current-player').textContent = currentPlayerName;

    // Update players list
    const playersContainer = document.getElementById('players-container');
    playersContainer.innerHTML = '';
    
    if (gameState.status === 'waiting') {
        playersContainer.innerHTML = `
            <div class="waiting-message">
                Waiting for ${gameState.playersNeeded} more player${gameState.playersNeeded > 1 ? 's' : ''} to join...
            </div>
        `;
    }

    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player-item ${player.id === gameState.currentPlayer?.id ? 'current-player' : ''}`;
        playerDiv.textContent = `${player.name}${player.id === gameState.currentPlayer?.id ? ' (Current Turn)' : ''}`;
        playersContainer.appendChild(playerDiv);
    });

    // Update letter buttons
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

socket.on('chatMessage', (message) => {
    displayChatMessage(message);
});
socket.on('waitingForResponses', ({ received, total }) => {
    showStatus(`Waiting for players to respond... (${received}/${total} responses)`, 'info');
});

socket.on('newGameRequested', ({ requestedBy }) => {
    const confirmDiv = document.getElementById('new-game-confirm');
    confirmDiv.style.display = 'block';
    document.getElementById('confirm-message').textContent = 
        `${requestedBy} wants to start a new game. Do you accept?`;
});
socket.on('newGameStarted', ({ message, gameState }) => {
    showStatus('All players accepted! Starting new game!', 'success');
    updateGameState(gameState);
    hideNewGameElements();
});

socket.on('returnToMenu', ({ message }) => {
    showStatus('Game rejected. Returning to menu...', 'info');
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

// init game when page loads
document.addEventListener('DOMContentLoaded', initializeGame);
document.getElementById('chat-input').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
});