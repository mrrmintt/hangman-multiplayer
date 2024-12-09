FROM node:18-alpine

WORKDIR /usr/src/app

# NPM Konfiguration für SSL-Problem
RUN npm config set strict-ssl false \
    && npm config set registry="https://registry.npmjs.org/" \
    && npm config set ca="" \
    && npm config set https-proxy="" \
    && npm config set proxy="" \
    && npm config set node-options="--no-warnings"

# Kopiere package.json
COPY package*.json ./

# Installiere Dependencies mit HTTPS
RUN npm cache clean --force && \
    NODE_TLS_REJECT_UNAUTHORIZED=0 npm install --verbose --no-optional --unsafe-perm

# Kopiere Anwendungsdateien
COPY . .

# Port
EXPOSE 3005

CMD ["node", "src/server.js"]