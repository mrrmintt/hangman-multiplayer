docker-compose up --build 

to access databank:
-docker exec -it hangman-multiplayer-mongodb-1 mongosh
-use hangman
-db.scores.find()


healthcheck while docker running:
curl http://localhost/health/socket
curl http://localhost/health/game
curl http://localhost/health/chat