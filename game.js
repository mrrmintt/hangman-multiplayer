class Game {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.word = this.getRandomWord();
        this.guessedLetters = new Set();
        this.currentPlayerIndex = 0;
        this.remainingGuesses = 6;
        this.status = 'waiting'; 
    }

    getRandomWord() {
        const words = ['JAVASCRIPT', 'NODEJS', 'EXPRESS', 'SOCKET', 'PROGRAMMING'];
        return words[Math.floor(Math.random() * words.length)];
    }

    addPlayer(playerId, playerName) {
        if (this.players.length < 2 && this.status === 'waiting') {
            if (this.players.some(p => p.name === playerName)) {
                return { success: false, message: 'This name is already taken in this game' };
            }
            this.players.push({ id: playerId, name: playerName });
            if (this.players.length === 2) {
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
                this.status = 'finished';
                return true;
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
            players: this.players
        };
    }
}

module.exports = Game;