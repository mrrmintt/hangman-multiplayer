console.log('Client script loading...');

const socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    secure: false
});
const HANGMAN_STATES = [
    // 0 Fehler
    `
     +---+
     |   |
         |
         |
         |
         |
    ==========`,
    // 1 Fehler
    `
     +---+
     |   |
     O   |
         |
         |
         |
    ==========`,
    // 2 Fehler
    `
     +---+
     |   |
     O   |
     |   |
         |
         |
    ==========`,
    // 3 Fehler
    `
     +---+
     |   |
     O   |
    /|   |
         |
         |
    ==========`,
    // 4 Fehler
    `
     +---+
     |   |
     O   |
    /|\\  |
         |
         |
    ==========`,
    // 5 Fehler
    `
     +---+
     |   |
     O   |
    /|\\  |
    /    |
         |
    ==========`,
    // 6 Fehler - Game Over
    `
     +---+
     |   |
     O   |
    /|\\  |
    / \\  |
         |
    ==========`
];

function updateHangman(remainingGuesses) {
    const maxGuesses = 8;
    const stateIndex = Math.min(
        HANGMAN_STATES.length - 1, 
        Math.floor((maxGuesses - remainingGuesses) * (HANGMAN_STATES.length / maxGuesses))
    );
    document.getElementById('hangman-drawing').innerHTML = HANGMAN_STATES[stateIndex];
}
// Debug-Logs hinzufügen
socket.on('connect', () => {
    console.log('Connected to socket server with ID:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
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
let turnTimer = null;  
let timeLeft = 10;     
let gameStarted = false;

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
function showScoreNotification(points) {
    if (points > 0) {
        const notification = document.createElement('div');
        notification.className = 'score-notification';
        notification.textContent = `+${points} points!`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 1000);
    }
}
function updateTimer() {
    const timerElement = document.getElementById('turn-timer');
    if (timerElement) {
        timerElement.textContent = timeLeft;
        
        // Change color based on time remaining
        if (timeLeft > 5) {
            timerElement.style.color = 'green';
        } else if (timeLeft > 2) {
            timerElement.style.color = 'orange';
        } else {
            timerElement.style.color = 'red';
        }
    }
}
function startTurnTimer() {
    // Clear existing timer
    if (turnTimer) {
        clearInterval(turnTimer);
        turnTimer = null;
    }
    
    timeLeft = 10;
    updateTimer();

    turnTimer = setInterval(() => {
        timeLeft--;
        updateTimer();
        
        if (timeLeft <= 0) {
            clearInterval(turnTimer);
            turnTimer = null;
            makeGuess(''); // Empty guess for timeout
        }
    }, 1000);
}

function createGame() {
    console.log('Create game clicked');
    const playerNameInput = document.getElementById('player-name');
    if (!playerNameInput) {
        console.error('Player name input not found');
        return;
    }
    
    playerName = playerNameInput.value.trim();
    console.log('Player name:', playerName);
    
    if (!playerName) {
        showStatus('Please enter your name', 'error');
        return;
    }
    
    // Debug-Log hinzufügen
    console.log('Emitting createGame event with:', { playerName });
    
    resetChat();
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
    if (!currentGameId) return;
    
    // Start game if this is the first move
    if (!gameStarted && letter !== '') {
        gameStarted = true;
    }

    // Clear existing timer
    if (turnTimer) {
        clearInterval(turnTimer);
        turnTimer = null;
    }

    socket.emit('makeGuess', {
        gameId: currentGameId,
        letter,
        guessTime: Date.now()
    });
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
    console.log('Game state update:', gameState);
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
    gameStarted = false; // Reset game started flag
    showStatus(message, 'success');
    updateGameState(gameState);
    hideNewGameElements();
    
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
    console.log('Game Over received:', { result, word, isHost });
    
    // Clear any existing timer
    if (turnTimer) {
        clearInterval(turnTimer);
        turnTimer = null;
    }
    
    gameStarted = false; // Reset game started state
    
    const message = result === 'win' ? 
        `Congratulations! You've won! The word was: ${word}` :
        `Game Over! The word was: ${word}`;
    showStatus(message, result === 'win' ? 'success' : 'error');
    
    // Show new game button for host with a slight delay
    if (isHost) {
        console.log('This player is host, showing new game button');
        setTimeout(() => {
            const newGameButton = document.getElementById('request-new-game');
            console.log('Found new game button:', newGameButton);
            if (newGameButton) {
                newGameButton.style.display = 'block';
                newGameButton.style.opacity = '1';
                console.log('Set button display to block');
                
                // Force button visibility
                newGameButton.setAttribute('style', 'display: block !important; margin-top: 20px;');
            } else {
                console.error('New game button element not found');
            }
        }, 1000);
    } else {
        console.log('This player is not host, no new game button shown');
    }
});
function requestNewGame() {
    console.log('Requesting new game for:', currentGameId);
    
    // Hide the button
    const newGameButton = document.getElementById('request-new-game');
    if (newGameButton) {
        newGameButton.style.display = 'none';
    }

    // Emit the event
    socket.emit('requestNewGame', { gameId: currentGameId });
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
    document.getElementById('word').textContent = gameState.word;
    document.getElementById('guesses').textContent = gameState.remainingGuesses;
    updateHangman(gameState.remainingGuesses);

    // Update players list with scores
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
        playerDiv.innerHTML = `
            <span class="player-name">${player.name}</span>
            <span class="player-score">Score: ${player.score || 0}</span>
            ${player.id === gameState.currentPlayer?.id ? ' (Current Turn)' : ''}
        `;
        playersContainer.appendChild(playerDiv);
    });

    const currentPlayerName = gameState.currentPlayer ? gameState.currentPlayer.name : 'Waiting...';
    document.getElementById('current-player').textContent = currentPlayerName;

    // Update letter buttons
    
    const isMyTurn = gameState.currentPlayer && gameState.currentPlayer.id === socket.id;   
    const buttons = document.getElementById('letters').getElementsByTagName('button');
    Array.from(buttons).forEach(button => {
        button.disabled = 
            gameState.guessedLetters.includes(button.textContent) ||
            !isMyTurn ||
            gameState.status !== 'playing';
        
        button.classList.toggle('used', 
            gameState.guessedLetters.includes(button.textContent));
    });

    // Only start timer if game has started and it's my turn
    if (isMyTurn && gameState.status === 'playing' && gameStarted) {
        startTurnTimer();
    } else if (!isMyTurn && turnTimer) {
        clearInterval(turnTimer);
        turnTimer = null;
    }
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
// Funktion zum Laden der Tagesgewinner
async function loadDailyWinners() {
    try {
        const response = await fetch('/db/daily-winners');
        const winners = await response.json();
        
        const winnersDiv = document.getElementById('daily-winners');
        winnersDiv.innerHTML = winners.map(winner => `
            <div class="winner-item">
                <span class="winner-name">${winner.playerName}</span>
                <span class="winner-score">${winner.score} points</span>
                <span class="winner-time">${new Date(winner.playDate).toLocaleTimeString()}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading winners:', error);
    }
}

// Beim Laden der Seite ausführen
document.addEventListener('DOMContentLoaded', () => {
    loadDailyWinners();
    // Alle 30 Sekunden aktualisieren
    setInterval(loadDailyWinners, 30000);
});