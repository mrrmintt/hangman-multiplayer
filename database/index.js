const client = require('./redis');
const gameRecords = require('./gameRecords');

module.exports = {
    redis: client,
    ...gameRecords
};