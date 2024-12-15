docker-compose up --build <br />

to access databank:<br />
-docker exec -it hangman-multiplayer-mongodb-1 mongosh<br />
-use hangman<br />
-db.scores.find()<br />


healthcheck while docker running:<br />
curl http://localhost/health/socket<br />
curl http://localhost/health/game<br />
curl http://localhost/health/chat<br />

Man könnte den socket-server/server.js besser in serverConfig.js, socketHandlers.js und socketSetup.js aufteilen, aber das führte immer zu Probleme und wir haben das einfach nicht hinbekommen. <br />
