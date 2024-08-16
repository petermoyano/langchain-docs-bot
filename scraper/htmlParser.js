const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const rootDirectory = '/home/peter/chatbots/langchain-docs-chatbot/processor/react-docs-raw-data/';

const outputDirectory = '/home/peter/chatbots/langchain-docs-chatbot/scraper/parsed-docs/';

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
