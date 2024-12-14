const express = require('express');
const cors = require('cors');
const Chat = require('./chat');

class ChatServer {
    constructor(port = 3002) {
        this.app = express();
        this.port = port;
        this.chats = new Map();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
    }

    setupRoutes() {
        this.app.get('/health', this.handleHealthCheck.bind(this));

        // Chat routes
        this.app.post('/chats', this.createChat.bind(this));
        this.app.post('/chats/:gameId/messages', this.addMessage.bind(this));
        this.app.get('/chats/:gameId/messages', this.getChatHistory.bind(this));
        this.app.post('/chats/:gameId/reset', this.resetChat.bind(this));
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`Chat service running on port ${this.port}`);
        });
    }

    async handleHealthCheck(req, res) {
        try {
            const healthStatus = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'chat-service',
                activeChats: this.chats.size,
                uptime: `${Math.round(process.uptime())} seconds`
            };
            res.status(200).json(healthStatus);
        } catch (error) {
            this.handleError(res, error, 503);
        }
    }

    async createChat(req, res) {
        try {
            const { gameId } = req.body;

            if (!gameId) {
                return this.handleError(res, new Error('GameId is required'), 400);
            }

            this.validateGameId(gameId);
            this.chats.set(gameId, new Chat());

            console.log(`Created new chat for game: ${gameId}`);
            res.json({ success: true, gameId });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async addMessage(req, res) {
        try {
            const { gameId } = req.params;
            const { username, message } = req.body;

            this.validateMessageInput(username, message);
            const chat = this.getChatInstance(gameId);

            const newMessage = chat.addMessage(username, message);
            console.log(`New message in game ${gameId} from ${username}`);

            res.json(newMessage);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getChatHistory(req, res) {
        try {
            const { gameId } = req.params;
            const chat = this.getChatInstance(gameId);
            res.json(chat.getAllMessages());
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async resetChat(req, res) {
        try {
            const { gameId } = req.params;
            this.validateGameId(gameId);

            this.chats.set(gameId, new Chat());
            console.log(`Reset chat for game: ${gameId}`);

            res.json({
                success: true,
                message: 'Chat reset successfully',
                gameId
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    // Helper methods
    getChatInstance(gameId) {
        const chat = this.chats.get(gameId);
        if (!chat) {
            throw new Error('Chat not found');
        }
        return chat;
    }

    validateGameId(gameId) {
        if (!gameId || typeof gameId !== 'string') {
            throw new Error('Invalid gameId format');
        }
    }

    validateMessageInput(username, message) {
        if (!username || typeof username !== 'string') {
            throw new Error('Username is required');
        }
        if (!message || typeof message !== 'string') {
            throw new Error('Message content is required');
        }
    }

    handleError(res, error, statusCode = 500) {
        console.error('Error:', error.message);
        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}

// Start the server
const chatServer = new ChatServer();
chatServer.start();

module.exports = ChatServer;