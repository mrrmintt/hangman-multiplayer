class Game {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.word = this.initializeWord();
        this.guessedLetters = new Set();
        this.currentPlayerIndex = 0;
        this.remainingGuesses = 8;
        this.status = 'waiting';
        this.turnStartTime = Date.now();
        this.scores = new Map(); // For storing player scores
    }

    
    async initializeWord() {
        const word = await this.generateRandomWord();
        if (word && word !== 'default') {
            this.word = word;
        } else {
            throw new Error('Wort konnte nicht abgerufen werden');
        }
    }

    
 generateRandomWord = async() => {
    try {
        const response = await fetch('https://random-word-api.herokuapp.com/word?lang=de'); // Hol dir ein zufälliges Wort
        const data = await response.json(); // Antworte mit JSON

        if (!response.ok || !data || data.length === 0) {
            throw new Error('Kein Wort von der API erhalten');
        }

        const randomWord = data[0]; // Das zufällige Wort

        console.log('Zufälliges Wort:', randomWord);
        return randomWord;
    } catch (error) {
        console.error('Fehler beim Abrufen des zufälligen Wortes:', error);
        return 'default';  // Standardwort, falls Fehler auftreten
    }
    };

    resetGame = async () =>{
        this.word = await this.initializeWord();
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
            this.players.push({ id: playerId, name: playerName });
            this.scores.set(playerId, 0); // Initialize score for new player
            
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
            // Just move to next player without any other changes
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
    
        // Move to next player and reset timer
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
        // Sortiere die Spieler nach der Punktzahl
        const sortedPlayers = this.players.map(player => ({
            ...player,
            score: this.scores.get(player.id) || 0
        })).sort((a, b) => b.score - a.score);
    
        // Stelle sicher, dass `this.word` ein String ist
        const word = typeof this.word === 'string' ? this.word : ''; // Falls `this.word` nicht gesetzt ist, wird ein leerer String verwendet.
    
        return {
            word: this.status === 'finished' ? 
                word : // Zeige das vollständige Wort, wenn das Spiel beendet ist
                [...word].map(letter => 
                    this.guessedLetters.has(letter) ? letter : '_'
                ).join(''),
            guessedLetters: Array.from(this.guessedLetters),
            remainingGuesses: this.remainingGuesses,
            currentPlayer: this.getCurrentPlayer(),
            status: this.status,
            players: sortedPlayers,
            timeRemaining: 10,
            playersNeeded: 3 - this.players.length,
            actualWord: word // Zeige immer das tatsächliche Wort
        };
    }
    
}

module.exports = Game;