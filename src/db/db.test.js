const db = require('./index');

beforeAll(() => {
    db.reset();
})

afterAll(() => {
    db.close();
})

test('can insert and retrieve a word in the database', () => {
    const wordData = {
        word: 'test',
        pos: 'noun',
        definitions: [{
            definition: 'a set of questions or exercises intended to find out a person’s ability, knowledge etc; a short examination',
            translation: 'แบบทดสอบ',
            example: 'an arithmetic/driving test'
        }]
    }
    db.insert(wordData);
    const row = db.find('test');
    expect(row).toStrictEqual(wordData);
});