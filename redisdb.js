const { createClient } = require('redis');

// Erstelle den Redis-Client
const client = createClient();

// Verbinde mit Redis
async function connectRedis() {
    try {
        await client.connect();
        console.log("Verbindung zu Redis erfolgreich hergestellt!");
    } catch (err) {
        console.error("Verbindungsfehler mit Redis:", err);
    }
}

async function createGameRecord(spielId, username, score) {
    const key = `game:${spielId}`;  // Schlüsselname für den Datensatz

    await client.hSet(key, {
        spielId: spielId,
        username: username,
        score: score
    });
    
    console.log(`Datensatz für Spiel ${spielId} erstellt:`, { spielId, username, score });
}

client.on("error", (err) => console.error("Redis-Fehler:", err));

// Fehlerereignis für den Client
client.on("error", (err) => {
    console.error("Redis-Fehler:", err);
});

// Verbindungstest
connectRedis();
createGameRecord(spielId, username, score);
