import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchContent(path) {
  const { stdout } = await execPromise(`gh api /repos/vercel/ai/contents/${path}`);
  return JSON.parse(stdout);
}

async function scrapeDocs() {
  const saveDir = path.resolve(__dirname, '../processor/sdk.vercel.ai-docs-raw-data');

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  async function processDirectory(dirPath) {
    const contents = await fetchContent(dirPath);

    for (const item of contents) {
      if (item.type === 'file' && item.name.endsWith('.mdx')) {
        const { stdout } = await execPromise(`gh api ${item.url}`);
        const fileContent = JSON.parse(stdout);
        const decodedContent = Buffer.from(fileContent.content, 'base64').toString('utf-8');
        const fileName = item.path.replace(/\//g, '_');
        fs.writeFileSync(path.join(saveDir, fileName), decodedContent);
        console.log(`Saved: ${fileName}`);
      } else if (item.type === 'dir') {
        await processDirectory(item.path);
      }
    }
  }

  await processDirectory('content');

  console.log('Scraping completed.');
}

scrapeDocs();
