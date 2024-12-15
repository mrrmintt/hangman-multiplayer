/* 
* Core game logic class managing multiplayer hangman mechanics.
* Handles player management, turn-based gameplay, scoring system,
* and supports both public/private game modes.
*/


//init
class Game {
    constructor(id, isPublic = false) {
        this.id = id;
        this.players = [];
        this.word = this.getRandomWord();
        this.guessedLetters = new Set();
        this.currentPlayerIndex = 0;
        this.remainingGuesses = 8;
        this.status = 'waiting';
        this.turnStartTime = Date.now();
        this.scores = new Map(); // For storing player scores
        this.public = isPublic // Public or private Game
    }

    async getRandomWord() {
        const response = await fetch('https://random-word-api.herokuapp.com/word?lang=de');
        const data = await response.json();
        const word = data[0].toUpperCase();
        console.log("WORT VON APl:", word);
        this.word = word
        return word;
    }
    
    
    resetGame() {
        this.word = this.getRandomWord();
        this.guessedLetters = new Set();
        this.remainingGuesses = 8;
        this.currentPlayerIndex = 0;
        this.status = 'playing';
        this.turnStartTime = Date.now();

    }
    addPlayer(playerId, playerName) {
        if (this.players.length < 3 && this.status === 'waiting') {
            // if (this.players.some(p => p.name === playerName)) {
            //    return { success: false, message: 'This name is already taken in this game' };
            //}
            this.players.push({
                id: playerId,
                name: playerName
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
        for (let letter of this.word) {
            if (!this.guessedLetters.has(letter)) {
                return false; // Wenn ein Buchstabe nicht erraten wurde
            }
        }
        return true; // Wenn alle Buchstaben erraten wurden
    }
    getGameState() {
        // Sortiere die Spieler nach Punktzahl
        const sortedPlayers = this.players.map(player => ({
            ...player,
            score: this.scores.get(player.id) || 0
        })).sort((a, b) => b.score - a.score);
    
        const displayedWord = this.status === 'finished' ? 
            this.word :
            (typeof this.word === 'string' ? 
                this.word.split('').map(letter => 
                    this.guessedLetters.has(letter) ? letter : '_'
                ).join('') 
                : '');
    
        return {
            word: displayedWord,
            guessedLetters: Array.from(this.guessedLetters),
            remainingGuesses: this.remainingGuesses,
            currentPlayer: this.getCurrentPlayer(),
            status: this.status,
            players: sortedPlayers,
            timeRemaining: 10,
            playersNeeded: 3 - this.players.length,
            actualWord: this.word
        };
    }
    
    getAllGames() {
        return Array.from(games.values());
    }

    createGame(isPublic = false) {
        const id = generateUniqueId();
        const game = new Game(id, isPublic);
        games.set(id, game);
        return game;
    }

    getGame(gameId) {
        return games.get(gameId);
    }

    removeGame(gameId) {
        games.delete(gameId);
    }
}

module.exports = Game;