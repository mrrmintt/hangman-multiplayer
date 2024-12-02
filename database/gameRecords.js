const client = require('./redis');

// Create game record
async function createGameRecord(spielId, username, score) {
    try {
        if (!client.isOpen) {
            await client.connect();
        }
        const key = `game:${spielId}:${username}`;
        const scoreValue = Number(score);
        if (isNaN(scoreValue)) {
            console.error(`Invalid score value for ${username}:`, score);
            return;
        }
        const result = await client.hSet(key, 'username', username, 'score', scoreValue);
        console.log(`Record created for player ${username} in game ${spielId} with score ${scoreValue}, result: ${result}`);
    } catch (err) {
        console.error('Error saving game data:', err);
        throw err;
    }
}

// Get game record
async function getGameRecord(spielId, username) {
    try {
        if (!client.isOpen) {
            await client.connect();
        }
        const key = `game:${spielId}:${username}`;
        const score = await client.hGet(key, 'score');
        const scoreValue = Number(score);
        if (isNaN(scoreValue)) {
            console.error(`Invalid score value for ${username}: ${score}`);
            return null;
        }
        return {
            username: username,
            score: scoreValue
        };
    } catch (err) {
        console.error('Error retrieving game data:', err);
        throw err;
    }
}

// Get all records for a game
async function getGameRecords(spielId) {
    try {
        if (!client.isOpen) {
            await client.connect();
        }
        const pattern = `game:${spielId}:*`;
        const keys = await client.keys(pattern);
        const records = [];
        
        for (const key of keys) {
            const username = key.split(':')[2];
            const record = await getGameRecord(spielId, username);
            if (record) {
                records.push(record);
            }
        }   
        
        return records;
    } catch (err) {
        console.error('Error retrieving game records:', err);
        throw err;
    }
}

module.exports = {
    createGameRecord,
    getGameRecord,
    getGameRecords
};
