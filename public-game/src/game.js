class Game {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.word = this.getRandomWord();
        this.guessedLetters = new Set();
        this.currentPlayerIndex = 0;
        this.remainingGuesses = 8;
        this.status = 'waiting';
        this.turnStartTime = Date.now();
        this.scores = new Map(); // For storing player scores
    }

    getRandomWord() {
        const words = ['JAVASCRIPT', 'NODEJS', 'EXPRESS', 'SOCKET', 'PROGRAMMING'];
        return words[Math.floor(Math.random() * words.length)];
    }
    resetGame() {
        this.word = this.getRandomWord();
        this.guessedLetters = new Set();
        this.remainingGuesses = 8;
        this.currentPlayerIndex = 0;
        this.status = 'playing';
        this.turnStartTime = Date.now();
        // Note: We don't reset scores here to maintain them across rounds
    }
    addPlayer(playerId, playerName) {
        if (this.players.length < 3 && this.status === 'waiting') {
            if (this.players.some(p => p.name === playerName)) {
                return { success: false, message: 'This name is already taken in this game' };
            }
            this.players.push({ 
                id: playerId, 
                name: playerName   // Stelle sicher, dass der Name hier korrekt gesetzt wird
            });
            this.scores.set(playerId, 0);
            
            if (this.players.length === 3) {
                this.status = 'playing';
                this.turnStartTime = Date.now();
            }
            return { success: true };
        }
        return { success: false, message: 'Game is full or already in progress' };
    }
    
    

    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            this.players.splice(index, 1);
            if (this.status === 'playing') {
                // If a player leaves during the game
                this.status = 'finished';
                return true;
            }
            // Adjust currentPlayerIndex if necessary
            if (this.currentPlayerIndex >= this.players.length) {
                this.currentPlayerIndex = 0;
            }
        }
        return false;
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    makeGuess(letter) {
        if (this.status !== 'playing') {
            return { result: 'invalid', score: 0 };
        }
    
        if (this.guessedLetters.has(letter)) {
            return { result: 'invalid', score: 0 };
        }
    
        // Handle empty guess (timeout)
        if (letter === '') {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            this.turnStartTime = Date.now();
            return { result: 'continue', score: 0 };
        }
    
        const timeTaken = (Date.now() - this.turnStartTime) / 1000;
        this.guessedLetters.add(letter);
        let score = 0;
    
        const currentPlayer = this.getCurrentPlayer();
        if (this.word.includes(letter)) {
            if (timeTaken <= 5) {
                score = 10;
            } else if (timeTaken <= 10) {
                score = 5;
            }
            this.scores.set(currentPlayer.id, (this.scores.get(currentPlayer.id) || 0) + score);
        } else {
            this.remainingGuesses--;
        }
    
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.turnStartTime = Date.now();
    
        if (this.isWordGuessed()) {
            this.status = 'finished';
            return { result: 'win', score, word: this.word };
        } else if (this.remainingGuesses <= 0) {
            this.status = 'finished';
            return { result: 'lose', score, word: this.word };
        }
    
        return { result: 'continue', score };
    }

    isWordGuessed() {
        return [...this.word].every(letter => this.guessedLetters.has(letter));
    }

    

    getGameState() {
        // Sort players by score
        const sortedPlayers = this.players.map(player => ({
            ...player,
            score: this.scores.get(player.id) || 0
        })).sort((a, b) => b.score - a.score);
    
        return {
            word: this.status === 'finished' ? 
                this.word : // Show full word if game is finished
                [...this.word].map(letter => 
                    this.guessedLetters.has(letter) ? letter : '_'
                ).join(''),
            guessedLetters: Array.from(this.guessedLetters),
            remainingGuesses: this.remainingGuesses,
            currentPlayer: this.getCurrentPlayer(),
            status: this.status,
            players: sortedPlayers,
            timeRemaining: 10,
            playersNeeded: 3 - this.players.length,
            actualWord: this.word // Always include the actual word
        };
    }
}

module.exports = Game;