class NewGameManager {
    constructor(game) {
        this.game = game;
        this.pendingNewGameRequest = false;
    }

    requestNewGame(hostId) {
        if (this.game.status !== 'finished') {
            return { success: false, message: 'Can only start new game when current game is finished' };
        }

        const host = this.game.players.find(p => p.id === hostId);
        if (!host) {
            return { success: false, message: 'Player not found' };
        }

        this.pendingNewGameRequest = true;
        return { success: true };
    }

    handleResponse(playerId, accepted) {
        if (!this.pendingNewGameRequest) {
            return { success: false, message: 'No pending new game request' };
        }

        this.pendingNewGameRequest = false;

        if (accepted) {
            // Reset game state
            this.game.word = this.game.getRandomWord();
            this.game.guessedLetters = new Set();
            this.game.remainingGuesses = 6;
            this.game.status = 'playing';
            this.game.currentPlayerIndex = 0; // First player starts
            
            return { 
                success: true, 
                result: 'accepted',
                gameState: this.game.getGameState() 
            };
        }

        return { 
            success: true, 
            result: 'rejected'
        };
    }
}

module.exports = NewGameManager;