import { Octokit } from "@octokit/rest";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const octokit = new Octokit();

async function fetchContent(path) {
  const response = await octokit.repos.getContent({
    owner: 'vercel',
    repo: 'ai',
    path: path,
  });

  return response.data;
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
        const fileContent = await octokit.repos.getContent({
          owner: 'vercel',
          repo: 'ai',
          path: item.path,
        });

        const decodedContent = Buffer.from(fileContent.data.content, 'base64').toString('utf-8');
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
