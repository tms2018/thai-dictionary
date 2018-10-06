const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const promisify = require("util").promisify;
const readFile = promisify(fs.readFile);

const cp = require('child_process');
const cpPath = path.resolve(__dirname, 'db-interface.js');
const dbProcess = cp.fork(cpPath);

const startWord = process.argv[2];

(async () => {
    try {
        const urlsFilePath = path.resolve(__dirname, 'data', 'urls.json')
        let urls = JSON.parse(await readFile(urlsFilePath));
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        if (startWord !== undefined) {
            const idx = urls.findIndex(url => url.indexOf(startWord) !== -1);
            urls = urls.slice(idx, -1);
        }
        console.log(urls[0]);
        for (const url of urls) {
            try {
                await page.goto(
                    url,
                    { timeout: 0 }
                );
                const mainWord = await extractMainWord(page);
                const derivedWords = await extractDerivedWords(page);

                derivedWords.push(mainWord);
                dbProcess.send(derivedWords);
                console.log(mainWord.word)
                await sleep(3000);
            } catch (e) {
                console.error(`Error: ${e.message}`);
            }
        }
        dbProcess.disconnect();
        await browser.close();
    } catch (e) {
        console.error(`Didn't even load a page`);
        console.error(`Error: ${e.message}`);
    }
})();

// puppeteer $eval functions throw an error if the element isn't found
// this catches the error and returns an empty string instead of throwing
async function valueOrEmptyString(func) {
    try {
        return await func();
    } catch (error) {
        return Promise.resolve("");
    }
}

async function extractMainWord(page) {
    const container = await page.$(".entry-body");
    const word = await container.$eval(".h3.di-title", el =>
        el.innerHTML.trim()
    );
    const pos = await container.$eval(".pos", el => el.innerHTML.trim());
    const definitions = await extractDefinitions(
        await container.$$(".di-body > .pos-body > .def-block")
    );

    return { word, pos, definitions };
}

function removeAnchorTags(el) {
    return el.innerHTML.trim().replace(/<[^>]*>/g, "")
}

async function extractDefinitions(defElements) {
    const definitions = [];
    for (let defElement of defElements) {
        const [definition, translation, example] = await Promise.all([
            defElement.$eval(".def", removeAnchorTags),
            valueOrEmptyString(() => defElement.$eval(".trans", el => el.innerHTML.trim())),
            valueOrEmptyString(() => defElement.$eval(".examp", removeAnchorTags))
        ]);
        definitions.push({ definition, translation, example });
    }
    return definitions;
}

async function extractDerivedWords(page) {
    const words = [];

    try {
        const wordElements = await page.$$(".runon");

        for (let wordElement of wordElements) {
            try {
                const [word, pos, definition, translation, example] = await Promise.all(
                    [
                        wordElement.$eval(".w", el =>
                            el.innerHTML.trim().replace(/<[^>]*>/g, "")
                        ),
                        valueOrEmptyString(() =>
                            wordElement.$eval(".pos", el =>
                                el.innerHTML.trim()
                            )
                        ),
                        valueOrEmptyString(() =>
                            wordElement.$eval(".def", el =>
                                el.innerHTML.trim().replace(/<[^>]*>/g, "")
                            )
                        ),
                        valueOrEmptyString(() =>
                            wordElement.$eval(".trans", el =>
                                el.innerHTML.trim()
                            )
                        ),
                        valueOrEmptyString(() =>
                            wordElement.$eval(".examp", el =>
                                el.innerHTML.trim().replace(/<[^>]*>/g, "")
                            )
                        )
                    ]
                );
    
                words.push({
                    word,
                    pos,
                    definitions: [{ definition, translation, example }]
                });
            }
            catch(e) {
                console.error(`Error: ${e.message}`);
            }
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
        return words;
    }

    return words
}

async function sleep(time) {
    return new Promise(res => setTimeout(() => res(), time))
}