class Chat {
    //Initialisiert einen neuen Chat mit einer leeren Nachrichtenliste.
    constructor() {
        this.messages = [];
    }
    /* Core message handling*/
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
    _validateMessageInput(username, content) {
        if (!username || typeof username !== 'string') {
            throw new Error('Benutzername muss ein nicht-leerer String sein');
        }
        if (!content || typeof content !== 'string') {
            throw new Error('Nachrichteninhalt muss ein nicht-leerer String sein');
        }
    }

    getMessages() {
        return this.messages;
    }
}

module.exports = Chat;