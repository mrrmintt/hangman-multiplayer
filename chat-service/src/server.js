const express = require('express');
const cors = require('cors');
const Chat = require('./chat');
const app = express();
/* 
* Core Express server setup for the chat service.
* Uses in-memory storage with Map for chat management.
* chats are not persistent and will be lost on server restart.
*/
app.use(cors());
app.use(express.json());

// Store chats in memory
const chats = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
    try {
        
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'chat-service',
            activeChats: chats.size,
            uptime: Math.round(process.uptime()) + ' seconds'
        };
        res.status(200).json(healthStatus);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});
app.post('/chats', (req, res) => {
    console.log('New chat request received');
    try {
        const { gameId } = req.body;
        console.log('Creating chat for game:', gameId);
        chats.set(gameId, new Chat());
        res.json({ success: true });
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/chats/:gameId/messages', (req, res) => {
    try {
        const { gameId } = req.params;
        const { username, message } = req.body;
        console.log(`New message in game ${gameId} from ${username}: ${message}`);

        const chat = chats.get(gameId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const newMessage = chat.addMessage(username, message);
        res.json(newMessage);
    } catch (error) {
        console.error('Error adding message:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get chat history
app.get('/chats/:gameId/messages', (req, res) => {
    const { gameId } = req.params;
    const chat = chats.get(gameId);
    
    if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
    }

    res.json(chat.getMessages());
});
app.post('/chats/:gameId/reset', (req, res) => {
    try {
        const { gameId } = req.params;
        console.log(`Resetting chat for game: ${gameId}`);
        
        // Create new chat instance for this game
        chats.set(gameId, new Chat());
        
        res.json({ success: true, message: 'Chat reset successfully' });
    } catch (error) {
        console.error('Error resetting chat:', error);
        res.status(500).json({ error: error.message });
    }
});
const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Chat service running on port ${PORT}`);
});

