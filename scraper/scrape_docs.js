const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeDocs() {
  const baseURL = 'https://nextjs.org/docs';
  const saveDir = path.resolve(__dirname, 'data');

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(baseURL, { waitUntil: 'networkidle2' });

  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href^="/docs"]'));
    return anchors.map(anchor => anchor.href);
  });

  const mainPageContent = await page.content();
  fs.writeFileSync(path.join(saveDir, 'index.html'), mainPageContent);

  for (let link of links) {
    await page.goto(link, { waitUntil: 'networkidle2' });
    const content = await page.content();
    const fileName = link.split('/').filter(Boolean).join('_') + '.html';
    fs.writeFileSync(path.join(saveDir, fileName), content);
  }

  await browser.close();
  console.log('Scraping completed.');
}

scrapeDocs();
