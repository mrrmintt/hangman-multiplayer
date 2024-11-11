const { createGameRecord, getGameRecord, client } = require('../redisdb'); // Importiere die Funktionen und den Redis-Client

describe('Redis Game Record Test', () => {
    beforeAll(async () => {
        // Stelle sicher, dass der Client verbunden wird
        if (!client.isOpen) {
            await client.connect();
        }
    });

    afterAll(async () => {
        // Trenne die Verbindung nach den Tests
        if (client.isOpen) {
            await client.quit();
        }
    });

    it('should store and retrieve game data with correct score', async () => {
        const spielId = '1';
        const username1 = 'Player1';
        const score1 = '0';
        const username2 = 'Player2';
        const score2 = '0';

        // Speichern der Spieldaten
        await createGameRecord(spielId, username1, score1);
        await createGameRecord(spielId, username2, score2);

        // Hole die gespeicherten Spieldaten
        const gameDataPlayer1 = await getGameRecord(spielId, username1);
        const gameDataPlayer2 = await getGameRecord(spielId, username2);

        expect(gameDataPlayer1.username).toBe(username1);
        expect(gameDataPlayer1.score).toBe(0);

        expect(gameDataPlayer2.username).toBe(username2);
        expect(gameDataPlayer2.score).toBe(0);
    });
});
