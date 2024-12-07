FROM node:18-alpine

WORKDIR /usr/src/app

RUN npm config set strict-ssl false \
    && npm config set registry="https://registry.npmjs.org/"

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3003

CMD ["node", "src/server.js"]