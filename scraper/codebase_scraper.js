const fs = require('fs');
const path = require('path');

// Utility function to get the file extension and infer the programming language
function getLanguage(filePath) {
  const ext = path.extname(filePath);
  const languageMap = {
    '.js': 'JavaScript',
    '.ts': 'TypeScript',
    '.py': 'Python',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.cpp': 'C++',
    '.c': 'C',
    '.cs': 'C#',
    '.php': 'PHP',
    '.html': 'HTML',
    '.css': 'CSS',
    '.json': 'JSON',
  };

  return languageMap[ext] || 'Unknown';
}

// Function to collect metadata for a single file
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

// Function to traverse the directory and collect metadata for all files
function traverseDirectory(dirPath) {
  let allMetadata = [];

  function traverse(currentPath) {
    const files = fs.readdirSync(currentPath);

    files.forEach(file => {
      const fullPath = path.join(currentPath, file);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        // Recursively traverse subdirectories
        traverse(fullPath);
      } else if (stats.isFile()) {
        // Collect metadata for each file
        const fileMetadata = collectFileMetadata(fullPath);
        allMetadata.push(fileMetadata);
      }
    });
  }

  traverse(dirPath);
  return allMetadata;
}

// Example usage
const directoryPath = path.join(__dirname, 'langchain-docs-chatbot/scraper');
const metadata = traverseDirectory(directoryPath);

// Output the collected metadata
console.log(JSON.stringify(metadata, null, 2));
