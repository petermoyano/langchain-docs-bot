import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const framework = 'nextjs';

const rootDirectory = path.join(__dirname, '..', 'processor', `${framework}-docs-raw-data`);
const outputDirectory = path.join(__dirname, '..', 'processor', 'parsed-docs', `parsed-${framework}-docs`);

if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

function processFile(filePath) {
  console.log(`Processing file: ${filePath}`);

  const htmlContent = fs.readFileSync(filePath, 'utf8');

  const $ = cheerio.load(htmlContent);

  const text = $.text();

  const outputFileName = `${path.basename(filePath, '.html')}.txt`;
  const outputPath = path.join(outputDirectory, outputFileName);

  fs.writeFileSync(outputPath, text, 'utf8');

  console.log(`Finished processing ${filePath}, saved output to ${outputPath}`);
}

function processDirectory(directory) {
  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${err}`);
      return;
    }

    files.forEach((filename) => {
      const filePath = path.join(directory, filename);

      if (fs.statSync(filePath).isDirectory()) {
        processDirectory(filePath);
      } else if (path.extname(filename) === '.html') {
        processFile(filePath);
      }
    });
  });
}

processDirectory(rootDirectory);
