class Chat {
    constructor() {
        this.messages = [];
    }

    addMessage(username, message) {
        const timestamp = new Date().toLocaleTimeString();
        const newMessage = {
            username,
            message,
            timestamp
        };
        this.messages.push(newMessage);
        return newMessage;
    }

    getRecentMessages(count = 50) {
        return this.messages.slice(-count);
    }
}

module.exports = Chat;