const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
        
    try {
        await page.goto(process.env.HOME_URL);
        const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
        const groups = {}

        for (const letter of letters) {
            const group = await loadGroups(page, letter);
            groups[letter] = group;
            console.log(group);
            await sleep(2000);
        }
        
        fs.writeFileSync('groups.json', JSON.stringify(groups, null));
    } catch (e) {
        console.error(`Error: ${e.message}`);
    } finally {
        await browser.close();
    }
})();

async function loadGroups(page, letter) {
    await page.click(`#browseLetters a[data-letter="${letter}"`);
    await page.waitForSelector(`#browseGroups > li > a[data-group-id ^= "${letter}"`);
    return page.$$eval('#browseGroups > li > a', (els) => els.map(el => el.dataset.groupId));
}

async function sleep(time) {
    return new Promise(res => setTimeout(() => res(), time))
}