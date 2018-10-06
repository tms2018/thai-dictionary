const path = require('path');
const logPath = path.resolve(__dirname, 'data', 'log.txt');

const fs = require('fs');
const logStream = fs.createWriteStream(logPath, {'flags': 'a'});

const db = require('./db');
db.init();

process.on('message', (data) => {
    data.forEach(datum => {
        logStream.write(`${datum.word}\n`);
        db.insert(datum);
    });
});

process.on('disconnect', () => {
    db.close();
    logStream.close();
});