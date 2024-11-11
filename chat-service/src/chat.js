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

    getMessages() {
        return this.messages;
    }
}

module.exports = Chat;