const { createClient } = require('redis');

const client = createClient({
    url: 'redis://localhost:6379',
    database: 1
});

client.on('error', err => console.error('Redis Client Error:', err));
client.on('connect', () => console.log('Redis Client Connected'));
client.on('ready', () => console.log('Redis Client Ready'));

// Test connection when module loads
async function testConnection() {
    try {
        if (!client.isOpen) {
            console.log('Connecting to Redis...');
            await client.connect();
        }
        await client.set('test', 'working');
        const result = await client.get('test');
        console.log('Redis test result:', result);
    } catch (error) {
        console.error('Redis connection test failed:', error);
    }
}

testConnection();

module.exports = client;