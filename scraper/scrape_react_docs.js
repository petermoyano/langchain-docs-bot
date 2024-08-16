const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeDocs() {
  const baseURL = 'https://react.dev';
  const saveDir = path.resolve(__dirname, '../processor/react-docs-raw-data');

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(baseURL, { waitUntil: 'networkidle2' });

  // Select all top-level links that toggle the display of nested content
  const topLevelLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href^="/reference"], a[href^="/learn"], a[href^="/blog"]'));
    return anchors.map(anchor => anchor.href);
  });

  const allScrapableLinks = [];

  for (let topLink of topLevelLinks) {
    await page.goto(baseURL, { waitUntil: 'networkidle2' });

    // Click the current top-level link
    await page.evaluate((topLink, baseURL) => {
      const linkElement = document.querySelector(`a[href="${topLink.replace(baseURL, '')}"]`);
      if (linkElement) {
        linkElement.click();
      }
    }, topLink, baseURL);

    // Standard delay function
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Scrape the links that are now visible
    const visibleLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href^="/reference"], a[href^="/learn"], a[href^="/blog"]'));
      return anchors.map(anchor => anchor.href);
    });

    // Add these links to the list of all scrapable links
    allScrapableLinks.push(...visibleLinks);
  }

  // Remove duplicates (just in case)
  const uniqueLinks = [...new Set(allScrapableLinks)];

  // Scrape content from all unique links
  for (let link of uniqueLinks) {
    try {
      if (!link.startsWith('http')) {
        link = new URL(link, baseURL).href;
      }
      await page.goto(link, { waitUntil: 'networkidle2' });

      // Optional: add a delay here to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      const content = await page.content();
      const fileName = link.split('/').filter(Boolean).join('_') + '.html';
      fs.writeFileSync(path.join(saveDir, fileName), content);
    } catch (error) {
      console.error(`Failed to scrape ${link}:`, error);
    }
  }

  await browser.close();

  if (uniqueLinks.length > 10) {
    console.log('Scraping completed. Total links:', uniqueLinks.length);
  } else {
    console.log('Scraping appears to have failed. links.length:', uniqueLinks.length);
  }
}

scrapeDocs();
