const fs = require('fs');
const path = require('path');
const ignore = require('ignore');
const { getLanguage } = require('./getLanguage');

function loadGitignore(gitignorePath) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  return ignore().add(gitignoreContent);
}

function collectCodebaseMetadata(dirPath, gitignorePath) {
  const ig = loadGitignore(gitignorePath);
  let allMetadata = [];

  function traverse(currentPath) {
    const files = fs.readdirSync(currentPath);

    files.forEach(file => {
      const fullPath = path.join(currentPath, file);
      const relativePath = path.relative(dirPath, fullPath);
      const stats = fs.statSync(fullPath);

      if (ig.ignores(relativePath)) {
        return;
      }

      if (stats.isDirectory()) {
        traverse(fullPath);
      } else if (stats.isFile()) {
        const fileMetadata = collectFileMetadata(fullPath);
        allMetadata.push(fileMetadata);
      }
    });
  }

  traverse(dirPath);
  return allMetadata;
}

function collectFileMetadata(filePath) {
  const stats = fs.statSync(filePath);
  const metadata = {
    fileName: path.basename(filePath),
    filePath: filePath,
    lastModified: stats.mtime,
    fileSize: stats.size,
    language: getLanguage(filePath),
    hierarchy: path.relative(process.cwd(), filePath).split(path.sep).slice(0, -1)
  };

  return metadata;
}

// Corrected codebaseDir path
const codebaseDir = '/home/peter/chatbots/langchain-docs-chatbot';  // Absolute path to the codebase
const gitignorePath = path.join(codebaseDir, '.gitignore');
const metadata = collectCodebaseMetadata(codebaseDir, gitignorePath);

console.log(JSON.stringify(metadata, null, 2));
