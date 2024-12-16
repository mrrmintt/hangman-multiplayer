//console.log('Client script loading...');
/*
* Basically Frontend
* Core game state management and UI update functions.
* Handles player turns, timer countdown, game events and chat.      
* Uses socket.io events to sync game state across players.
*/
const socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    secure: false
});
//hangman images but with signs (Completely chat-GPT generated)
const HANGMAN_STATES = [

    `
     +---+
     |   |
         |
         |
         |
         |
    ==========`,

    `
     +---+
     |   |
     O   |
         |
         |
         |
    ==========`,

    `
     +---+
     |   |
     O   |
     |   |
         |
         |
    ==========`,

    `
     +---+
     |   |
     O   |
    /|   |
         |
         |
    ==========`,

    `
     +---+
     |   |
     O   |
    /|\\  |
         |
         |
    ==========`,

    `
     +---+
     |   |
     O   |
    /|\\  |
    /    |
         |
    ==========`,

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

// Hide Element on start page
document.getElementById('game-container').style.display = 'none';



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
    console.log('Status:', message, type);
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
            makeGuess('');
        }
    }, 1000);
}

function createGame() {
    let publicGame = false
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


    console.log('Emitting createGame event with:', { playerName });

    resetChat();
    socket.emit('createGame', { playerName, publicGame });
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

// Function to join a public game when button is clicked
function joinPublicGame() {
    console.log('Join Public game clicked');
    playerName = document.getElementById('player-name').value.trim();
    //const gameId = document.getElementById('game-id').value.trim();
    if (!playerName) {
        showStatus('Please enter your name ', 'error');
        return;
    }
    resetChat(); // Reset chat when joining game
    //currentGameId = gameId;
    socket.emit('joinPublicGame', { playerName });
}

function makeGuess(letter) {
    console.log("Make Guess")
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
    console.log("Message")
    console.log("GameID: " + currentGameId)
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
    console.log('Game created event received:', data);
    currentGameId = data.gameId;
    console.log('Setting game ID:', currentGameId);


    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';


    document.getElementById('current-game-id').textContent = currentGameId;


    showStatus(data.message || 'Waiting for other players...', 'info');

    console.log('UI updated for new game');
});

socket.on('error', ({ message }) => {
    console.error('Game error:', message);
    showStatus(message, 'error');
});

socket.on('gameStateUpdate', (gameState) => {
   // console.log('Game state update:', gameState);
    updateGameState(gameState);
});

socket.on('playerJoined', ({ message, gameState }) => {
    console.log('Player joined:', message);
    showStatus(message, 'success');
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('current-game-id').textContent = currentGameId;
    updateGameState(gameState);
});


socket.on('publicGameJoined', ({ publicGameId, gameState }) => {
    console.log('Successfully joined public game with ID:', publicGameId);


    currentGameId = publicGameId;


    showStatus('You have successfully joined the public game!', 'success');
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

    gameStarted = false;
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



socket.on('gameOver', ({ result, word, isHost, publicGame, gameId }) => {
    console.log('Game Over received:', { result, word, isHost, publicGame });

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

    console.log("PublicGame: " + publicGame)
    if (publicGame) {
        console.log("public game beendet")

        console.log("wurde emitted")

        socket.emit('newGame', { gameId: gameId });




    } else {


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


                    newGameButton.setAttribute('style', 'display: block !important; margin-top: 20px;');
                } else {
                    console.error('New game button element not found');
                }
            }, 1000);
        } else {
            console.log('This player is not host, no new game button shown');
        }
    }
});


function requestNewGame() {
    console.log('Requesting new game for:', currentGameId);


    const newGameButton = document.getElementById('request-new-game');
    if (newGameButton) {
        newGameButton.style.display = 'none';
    }


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

document.getElementById('chat-input').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
});
// Funktion zum Laden der Tagesgewinner
async function loadDailyWinners() {
    try {
        console.log('Fetching daily winners...');       

        const response = await fetch('/db/scores/daily-winners');
        const winners = await response.json();

        console.log('Received winners:', winners);

        const winnersDiv = document.getElementById('daily-winners');
        if (!winners || winners.length === 0) {
            winnersDiv.innerHTML = '<div class="no-winners">No games played today yet!</div>';
            return;
        }

        winnersDiv.innerHTML = winners.map(winner => `
            <div class="winner-item">
                <span class="winner-name">${winner.playerName}</span>
                <span class="winner-score">${winner.score} points</span>
                <span class="winner-time">${new Date(winner.playDate).toLocaleTimeString()}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading winners:', error);
        const winnersDiv = document.getElementById('daily-winners');
        winnersDiv.innerHTML = '<div class="error">Error loading winners</div>';
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadDailyWinners();
    setInterval(loadDailyWinners, 30000);
});


document.addEventListener('DOMContentLoaded', () => {
    loadDailyWinners();

    setInterval(loadDailyWinners, 30000);
});




