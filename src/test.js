const db = require('./db')

console.log(db.find(process.argv[2]));