FROM node:16

WORKDIR /usr/src/app

# NPM Konfiguration für SSL-Problem
RUN npm config set strict-ssl false \
    && npm config set registry="http://registry.npmjs.org/" \
    && npm config set ca="" \
    && npm config set https-proxy="" \
    && npm config set proxy="" \
    && npm config set node-options="--no-warnings"

# Kopiere package.json
COPY package*.json ./

# Installiere Dependencies
RUN npm cache clean --force && \
    npm install --verbose --no-optional --unsafe-perm

# Kopiere Anwendungsdateien
COPY . .

# Port
EXPOSE 80

CMD ["node", "src/server.js"]