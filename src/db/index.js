const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV == 'test' 
    ? path.join(process.cwd(), 'src', 'data', 'test.db')
    : path.join(process.cwd(), 'src', 'data', 'dictionary.db');

const db = new Database(dbPath);
const begin = db.prepare('BEGIN');
const commit = db.prepare('COMMIT');
const rollback = db.prepare('ROLLBACK');

function asTransaction(func) {
    return function (...args) {
        begin.run();
        try {
            func(...args);
            commit.run();
        } finally {
            if (db.inTransaction) rollback.run();
        }
    };
}

function dropTables() {
    begin.run();
    ['words', 'definitions']
        .forEach( table => 
            db.prepare(`DROP TABLE IF EXISTS ${table}`).run());
    commit.run();
}

function init() {
    db.prepare(`CREATE TABLE IF NOT EXISTS words (
        word_id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        pos TEXT NOT NULL
    )`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS definitions (
        definition TEXT NOT NULL,
        translation TEXT NOT NULL,
        example TEXT,
        word_id TEXT NOT NULL,
            FOREIGN KEY (word_id) REFERENCES words (word_id) ON DELETE CASCADE
    )`).run();
    db.prepare('CREATE INDEX IF NOT EXISTS english_translation ON words (word)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS thai_translation ON definitions (translation)').run();
}

function reset() {
    dropTables();
    createTables();
}

// Data objects passed to insert must have the following form;
/*
    data: object {
        word: string
        pos: string
        definitions: object[] [{
            definition: string
            translation: string
            example: string
        }]
    }
*/
const insert = asTransaction(function(data) {
    db.prepare('INSERT INTO words (word, pos) VALUES (@word, @pos)').run(data);
    const row = db.prepare(`SELECT last_insert_rowid()`).get();
    const word_id = row['last_insert_rowid()'];

    data.definitions.forEach( def => {
        db.prepare(`
            INSERT INTO definitions (definition, translation, example, word_id)
            VALUES (@definition, @translation, @example, @word_id)
        `).run({...def, word_id});
    });
})

function find(word) {
    try {
        const {word_id, ...result} = db.prepare(`SELECT word_id, word, pos FROM words WHERE word=?`).get(word);
        result.definitions = db.prepare(`SELECT definition, translation, example FROM definitions WHERE word_id=?`).all(word_id);
        return result;
    } catch (e) {
        return undefined;
    }
}

function close() {
    db.close();
}

module.exports = {
    reset,
    insert,
    init,
    find,
    close,
}