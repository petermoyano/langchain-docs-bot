import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function scrapeDocs() {
  // const baseURL = 'https://nextjs.org/docs';
  // const baseURL = 'https://react.dev';
  const baseURL = 'https://sdk.vercel.ai/';
  const saveDir = path.resolve(__dirname, '../processor/sdk.vercel.ai-docs-raw-data');

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(baseURL, { waitUntil: 'networkidle2' });

  const links = await page.evaluate(() => {
    // This line tells Puppeteer to select all anchor elements that have an href attribute starting with /docs.
    // const anchors = Array.from(document.querySelectorAll('a[href^="/docs"]')); // modify it depending on the docs structure
    // const anchors = Array.from(document.querySelectorAll('a[href^="/reference"], a[href^="/learn"], a[href^="/blog"]'));
    const anchors = Array.from(document.querySelectorAll('a[href^="/playground"], a[href^="/examples"], a[href^="/docs/introduction"], a[href^="/providers/ai-sdk-providers"]'));
    return anchors.map(anchor => anchor.href);
  });

  const mainPageContent = await page.content();
  fs.writeFileSync(path.join(saveDir, 'index.html'), mainPageContent);

  for (let link of links) {
    try {
      if (!link.startsWith('http')) {
        link = new URL(link, baseURL).href;
      }
      await page.goto(link, { waitUntil: 'networkidle2' });

      // If rate limit is reached, add a delay here
      // await new Promise(resolve => setTimeout(resolve, 1000));

      const content = await page.content();
      const fileName = link.split('/').filter(Boolean).join('_') + '.html';
      fs.writeFileSync(path.join(saveDir, fileName), content);
    } catch (error) {
      console.error(`Failed to scrape ${link}:`, error);
    }
  }

  await browser.close();
  if (links.length > 10) {
    console.log('Scraping completed.');
  } else {
    console.log('Scraping appears to have failed. links.lenght:', links.length);
  }
}

scrapeDocs();
