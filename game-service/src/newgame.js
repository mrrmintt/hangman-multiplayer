class NewGameManager {
    constructor(game) {
        this.game = game;
        this.pendingNewGameRequest = false;
        this.playerResponses = new Map(); // Track responses from each player
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
        this.playerResponses.clear(); // Clear previous responses
        return { success: true };
    }

    handleResponse(playerId, accepted) {
        if (!this.pendingNewGameRequest) {
            return { success: false, message: 'No pending new game request' };
        }

        // Record this player's response
        this.playerResponses.set(playerId, accepted);

        // Check if we have responses from all non-host players
        const nonHostPlayers = this.game.players.filter(p => p.id !== this.game.players[0].id);
        const haveAllResponses = nonHostPlayers.every(player => 
            this.playerResponses.has(player.id)
        );

        if (haveAllResponses) {
            // Check if all players accepted
            const allAccepted = Array.from(this.playerResponses.values()).every(response => response);
            
            this.pendingNewGameRequest = false;
            this.playerResponses.clear();

            if (allAccepted) {
                // Reset game state
                this.game.word = this.game.initializeWord();
                this.game.guessedLetters = new Set();
                this.game.remainingGuesses = 8;
                this.game.status = 'playing';
                this.game.currentPlayerIndex = 0;
                
                return { 
                    success: true, 
                    result: 'accepted',
                    gameState: this.game.getGameState() 
                };
            } else {
                return { 
                    success: true, 
                    result: 'rejected'
                };
            }
        }

        // Still waiting for other responses
        return {
            success: true,
            result: 'waiting'
        };
    }

    getPendingResponses() {
        return {
            total: this.game.players.length - 1,
            received: this.playerResponses.size
        };
    }
}

module.exports = NewGameManager;