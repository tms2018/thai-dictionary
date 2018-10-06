const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const dataDir = path.resolve(__dirname, 'data');
const groupsPath = path.join(dataDir, 'all-groups.json');
const groups = JSON.parse(fs.readFileSync(groupsPath));
const urls = [];
let currentLetter = 'a';

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    try {
        await page.goto(process.env.HOME_URL, {
            timeout: 0
        });
        
        for (let i=0; i<groups.length;) {
            try {
                let group = groups[i];
                if (group[0] !== currentLetter) {
                    currentLetter = group[0];
                    console.log(`Letter: ${group[0]}`);
                    await selectLetter(page, group[0]);
                    await sleep(3000);
                }
    
                // log to monitor progress, since I'm intentionally throttling the speed of requests
                console.log(`Group: ${group}`);
                
                await selectGroup(page, group);
                await sleep(3000);
                let currentUrls = await getWordUrls(page);
                urls.push(currentUrls);

                // increment inside the try block to automatically retry on error
                i++;
            } catch (e) {
                console.error(`Error: ${e.message}`);
                await sleep(20000);
            }
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
    } finally {
        await browser.close();
    }
    
    const urlsPath = path.join(dataDir, 'urls.json');
    fs.writeFileSync(urlsPath, JSON.stringify(urls));
})()

async function selectLetter(page, letter) {
    // page.click doesn't work here, because the elements are inside a scrolling div
    await page.$eval(`#browseLetters a[data-letter="${letter}"]`, el => el.click());
    return page.waitForSelector(`#browseGroups > li > a[data-group-id ^= "${letter}"]`);
}

async function selectGroup(page, group) {
    // page.click doesn't work here, because the elements are inside a scrolling div
    await page.$eval(`#browseGroups > li > a[data-group-id="${group}"]`, el => el.click());
    return page.waitForSelector(`#browseResults > li > a[href$="${group}"]`);
}

async function getWordUrls(page) {
    return  page.$$eval('#browseResults > li > a', (els) => els.map(el => el.href));
}

async function sleep(time) {
    return new Promise(res => setTimeout(() => res(), time))
}