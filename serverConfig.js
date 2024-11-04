const http = require('http');

function createServer(app) {
    const server = http.createServer(app);
    const PORT = process.env.PORT || 3000;
    
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    return server;
}

module.exports = { createServer };