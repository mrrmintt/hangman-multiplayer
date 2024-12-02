- open 4 terminals
- one terminal for one container (Folder)
- npm install
- node src/server.js

**ORDER IS IMPORTANG**
node socket-server folder at first then client folder then game-service and at last chat-service. 

If you have a problem with cors ==> npm install express cors




healthcheck while docker running:
curl http://localhost/health/socket
curl http://localhost/health/game
curl http://localhost/health/chat