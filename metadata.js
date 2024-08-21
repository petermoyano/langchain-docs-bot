const fs = require('fs');
const path = require('path');
const ignore = require('ignore');

const languageMap = {
  '.js': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TSX',
  '.jsx': 'JSX',
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
  '.txt': 'Text',
};

function getLanguage(filePath) {
  const ext = path.extname(filePath);
  if (!languageMap[ext]) {
    throw new Error(`Unknown language for file: ${filePath}`);
  }
  return languageMap[ext] || 'Unknown';
}

function loadGitignore(gitignorePath) {
  try {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    return ignore().add(gitignoreContent);
  } catch (err) {
    console.error(`Failed to load .gitignore: ${err.message}`);
    throw err;
  }
}

function collectFileMetadata(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const metadata = {
      fileName: path.basename(filePath),
      filePath: path.relative(process.cwd(), filePath), // Relative path
      lastModified: stats.mtime,
      fileSize: stats.size,
      language: getLanguage(filePath),
      hierarchy: path.relative(process.cwd(), filePath).split(path.sep).slice(0, -1),
    };

    return metadata;
  } catch (err) {
    console.error(`Failed to collect metadata for file ${filePath}: ${err.message}`);
    throw err;
  }
}

function collectCodebaseMetadata(dirPath) {
  const gitignorePath = path.join(dirPath, '.gitignore');
  const ig = loadGitignore(gitignorePath);
  let allMetadata = [];

  function traverse(currentPath) {
    try {
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
    } catch (err) {
      console.error(`Failed to traverse directory ${currentPath}: ${err.message}`);
      throw err;
    }
  }

  traverse(dirPath);
  return allMetadata;
}

function saveMetadataToFile(metadata, outputFileName) {
  try {
    const outputPath = path.join(process.cwd(), outputFileName);
    fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`Metadata saved to ${outputPath}`);
  } catch (err) {
    console.error(`Failed to save metadata to file ${outputFileName}: ${err.message}`);
    throw err;
  }
}

function runAiCoderHelper() {
  try {
    const codebaseDir = process.cwd();
    const metadata = collectCodebaseMetadata(codebaseDir);
    saveMetadataToFile(metadata, 'codebase_metadata.json');
  } catch (err) {
    console.error(`Error in runAiCoderHelper: ${err.message}`);
    console.error(err.stack);
  }
}

try {
  runAiCoderHelper();
} catch (err) {
  console.error(`Unhandled error: ${err.message}`);
  console.error(err.stack);
}