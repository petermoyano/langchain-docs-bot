import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function scrapeDocs() {
  console.log('Starting scrape process...');
  const baseURL = 'https://docs.llamaindex.ai/en/stable/';
  const saveDir = path.resolve(__dirname, '../processor/llamaindex-docs-raw-data');

  console.log(`Base URL: ${baseURL}`);
  console.log(`Save directory: ${saveDir}`);

  if (!fs.existsSync(saveDir)) {
    console.log('Creating save directory...');
    fs.mkdirSync(saveDir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`Navigating to ${baseURL}...`);
  await page.goto(baseURL, { waitUntil: 'networkidle0' });
  console.log('Page loaded.');

  console.log('Selecting top-level links...');
  const topLevelLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll(
      `a[href^="/understanding/"],
       a[href^="/use_cases/"],
       a[href^="/examples/"],
       a[href^="/module_guides/"],
       a[href^="/optimizing/production_rag/"],
       a[href^="/api_reference/"],
       a[href^="/llama_cloud/"],
       a[href^="/community/integrations/"]`));
    return anchors.map(anchor => anchor.href);
  });
  console.log(`Found ${topLevelLinks.length} top-level links:`, topLevelLinks);

  const allScrapableLinks = [];

  for (let topLink of topLevelLinks) {
    console.log(`Processing top-level link: ${topLink}`);
    await page.goto(baseURL, { waitUntil: 'networkidle2' });

    console.log('Clicking top-level link...');
    await page.evaluate((topLink, baseURL) => {
      const linkElement = document.querySelector(`a[href="${topLink.replace(baseURL, '')}"]`);
      if (linkElement) {
        linkElement.click();
      } else {
        console.log(`Link element not found for ${topLink}`);
      }
    }, topLink, baseURL);

    console.log('Waiting after click...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Scraping visible links...');
    const visibleLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll(
      `a[href^="/understanding/"],
       a[href^="/use_cases/"],
       a[href^="/examples/"],
       a[href^="/module_guides/"],
       a[href^="/optimizing/production_rag/"],
       a[href^="/api_reference/"],
       a[href^="/llama_cloud/"],
       a[href^="/community/integrations/"]`
      ));
      return anchors.map(anchor => anchor.href);
    });
    console.log(`Found ${visibleLinks.length} visible links:`, visibleLinks);

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
