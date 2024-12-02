class ScoreManager {
    constructor() {
        this.scores = new Map();
        this.turnStartTime = null;
    }

    initializePlayer(playerId) {
        this.scores.set(playerId, 0);
    }

    startTurn() {
        this.turnStartTime = Date.now();
        return this.turnStartTime;
    }

    calculateScore(playerId, isCorrect, guessTime) {
        if (!this.turnStartTime) return 0;
        
        const timeTaken = (guessTime - this.turnStartTime) / 1000; // Convert to seconds
        let points = 0;

        if (isCorrect) {
            if (timeTaken <= 5) {
                points = 10;  // Fast correct guess
                console.log(`Fast correct guess: +10 points for player ${playerId}`);
            } else if (timeTaken <= 10) {
                points = 5;   // Slower correct guess
                console.log(`Slow correct guess: +5 points for player ${playerId}`);
            }
        }

        // Add points to player's score
        const currentScore = this.scores.get(playerId) || 0;
        this.scores.set(playerId, currentScore + points);

        return points;
    }

    getScore(playerId) {
        return this.scores.get(playerId) || 0;
    }

    getAllScores() {
        return Array.from(this.scores.entries()).map(([playerId, score]) => ({
            playerId,
            score
        }));
    }

    getSortedPlayers(players) {
        return [...players].map(player => ({
            ...player,
            score: this.getScore(player.id)
        })).sort((a, b) => b.score - a.score);
    }

    resetScores() {
        this.scores.clear();
        this.turnStartTime = null;
    }

    timeRemaining(currentTime) {
        if (!this.turnStartTime) return 0;
        const elapsed = (currentTime - this.turnStartTime) / 1000;
        return Math.max(0, 10 - elapsed);
    }
}

module.exports = ScoreManager;