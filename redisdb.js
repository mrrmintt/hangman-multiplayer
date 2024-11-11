const { createClient } = require('redis');

// Client wird hier korrekt initialisiert
const client = createClient({
    url: 'redis://localhost:6379',
    database: 1
});

// Funktion zum Erstellen eines Spiel-Datensatzes
async function createGameRecord(spielId, username, score) {
    try {
        if (!client.isOpen) {
            await client.connect();
        }

        const key = `game:${spielId}:${username}`;
        const scoreValue = Number(score);

        if (isNaN(scoreValue)) {
            console.error(`Ungültiger Score-Wert für ${username}:`, score);
            return; 
        }

        const result = await client.hSet(key, 'username', username, 'score', scoreValue);
        console.log(`Datensatz für Spieler ${username} im Spiel ${spielId} erstellt mit Score ${scoreValue}, Resultat: ${result}`);
    } catch (err) {
        console.error('Fehler beim Speichern von Spiel-Daten:', err);
        throw err;
    }
}

// Funktion zum Abrufen eines Spiel-Datensatzes
async function getGameRecord(spielId, username) {
    try {
        if (!client.isOpen) {
            await client.connect();
        }

        const key = `game:${spielId}:${username}`;
        const score = await client.hGet(key, 'score');

        const scoreValue = Number(score);

        if (isNaN(scoreValue)) {
            console.error(`Ungültiger Score-Wert für ${username}: ${score}`);
            return null;
        }

        return {
            username: username,
            score: scoreValue
        };
    } catch (err) {
        console.error('Fehler beim Abrufen von Spiel-Daten:', err);
        throw err;
    }
}

// Export der Funktionen und des Redis-Clients
module.exports = {
    createGameRecord,
    getGameRecord,
    client // Exportiere den Client
};
