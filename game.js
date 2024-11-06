class Game {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.word = this.getRandomWord();
        this.guessedLetters = new Set();
        this.currentPlayerIndex = 0;
        this.remainingGuesses = 8; // Increased guesses for 3 players
        this.status = 'waiting'; // waiting, playing, finished
    }

    getRandomWord() {
        const words = ['JAVASCRIPT', 'NODEJS', 'EXPRESS', 'SOCKET', 'PROGRAMMING'];
        return words[Math.floor(Math.random() * words.length)];
    }

    addPlayer(playerId, playerName) {
        // Changed to allow 3 players
        if (this.players.length < 3 && this.status === 'waiting') {
            if (this.players.some(p => p.name === playerName)) {
                return { success: false, message: 'This name is already taken in this game' };
            }
            this.players.push({ id: playerId, name: playerName });
            // Start game when 3 players join
            if (this.players.length === 3) {
                this.status = 'playing';
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
        if (!this.guessedLetters.has(letter)) {
            this.guessedLetters.add(letter);
            if (!this.word.includes(letter)) {
                this.remainingGuesses--;
            }
            // Move to next player
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            
            if (this.isWordGuessed()) {
                this.status = 'finished';
                return 'win';
            } else if (this.remainingGuesses <= 0) {
                this.status = 'finished';
                return 'lose';
            }
            return 'continue';
        }
        return 'invalid';
    }

    isWordGuessed() {
        return [...this.word].every(letter => this.guessedLetters.has(letter));
    }

    getGameState() {
        return {
            word: [...this.word].map(letter => 
                this.guessedLetters.has(letter) ? letter : '_'
            ).join(''),
            guessedLetters: Array.from(this.guessedLetters),
            remainingGuesses: this.remainingGuesses,
            currentPlayer: this.getCurrentPlayer(),
            status: this.status,
            players: this.players,
            playersNeeded: 3 - this.players.length // New field to show how many players are still needed
        };
    }
}

module.exports = Game;