// The functionality present is this file is only meant for the propper build up
// and supervision of the codebase metadata.
// It's meant to be placed in the root of the codebase and run to generate the metadata JSON file.
const fs = require('fs');
const path = require('path');

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
  '.md': 'Markdown',
  '.gitattributes': 'Git',
  '.prettierrc': 'JSON',
  'Pipfile': 'Python',
  'Pipfile.lock': 'Python',
  '.prettierrc': 'JSON',
};

function getLanguage(filePath) {
  const ext = path.extname(filePath);
  if (!languageMap[ext]) {
    console.warn(`Warning: Unknown language for file: ${filePath}`);
    return 'Unknown'; // Gracefully handle unknown file types
  }
  return languageMap[ext];
}

// Function to load and parse the .gitignore file manually
function loadGitignore(gitignorePath) {
  const gitignorePatterns = [];

  try {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    const lines = gitignoreContent.split(/\r?\n/);

    lines.forEach(line => {
      // Ignore comments and empty lines
      if (line.trim() && !line.startsWith('#')) {
        gitignorePatterns.push(line.trim());
      }
    });
  } catch (err) {
    console.error(`Failed to load .gitignore: ${err.message}`);
    throw err;
  }

  return gitignorePatterns;
}

// Function to check if a file or directory should be ignored based on .gitignore patterns
function shouldIgnore(relativePath, gitignorePatterns, ignoredPaths) {
  // Normalize the relative path to use forward slashes (/) even on Windows
  const normalizedPath = relativePath.replace(/\\/g, '/');

  // Hardcoded ignores for node_modules and .git directories
  if (normalizedPath.includes('node_modules') || normalizedPath.startsWith('.git')) {
    ignoredPaths.push(normalizedPath);
    return true;
  }

  for (let pattern of gitignorePatterns) {
    // Handle patterns that are intended for directories
    const isDirectoryPattern = pattern.endsWith('/');
    let regexPattern = pattern.replace(/\*/g, '.*').replace(/\/$/, '(/.*)?'); // Adjust pattern for directories

    // Handle patterns that start with a slash (indicating the root)
    if (pattern.startsWith('/')) {
      regexPattern = '^' + regexPattern;
    } else {
      regexPattern = '.*' + regexPattern;
    }

    const regex = new RegExp(regexPattern);

    // Check if the normalized path matches the pattern
    if (regex.test(normalizedPath)) {
      if (isDirectoryPattern && !normalizedPath.endsWith('/')) {
        continue; // Skip if the pattern is for a directory but the path isn't
      }
      ignoredPaths.push(normalizedPath);
      return true;
    }

    // Handle patterns that match specific folder names like "__pycache__" or "raw-data"
    if (normalizedPath.includes('raw-data') || normalizedPath.includes('__pycache__') || normalizedPath.includes('parsed-docs')) {
      ignoredPaths.push(normalizedPath);
      return true;
    }
  }
  return false;
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
  const gitignorePatterns = loadGitignore(gitignorePath);
  let allMetadata = [];
  let fileCount = 0; // Initialize the file counter
  const ignoredPaths = []; // Array to hold all ignored paths
  const directoryFileCounts = {}; // Object to hold counts of files per directory

  function traverse(currentPath, depth = 0) {
    try {
      const files = fs.readdirSync(currentPath);

      files.forEach(file => {
        const fullPath = path.join(currentPath, file);
        const relativePath = path.relative(dirPath, fullPath);
        const stats = fs.statSync(fullPath);

        if (shouldIgnore(relativePath, gitignorePatterns, ignoredPaths)) {
          return;
        }

        if (stats.isDirectory()) {
          traverse(fullPath, depth + 1);
        } else if (stats.isFile()) {
          const fileMetadata = collectFileMetadata(fullPath);
          allMetadata.push(fileMetadata);
          fileCount++; // Increment the counter for each file processed

          // Track file count for the directory
          const directory = depth === 0 ? 'root' : path.dirname(relativePath);
          directoryFileCounts[directory] = (directoryFileCounts[directory] || 0) + 1;
        }
      });
    } catch (err) {
      console.error(`Failed to traverse directory ${currentPath}: ${err.message}`);
      throw err;
    }
  }

  traverse(dirPath);

  console.log(`Total files processed for metadata: ${fileCount}`); // Log the total count

  // Log detailed directory breakdown
  console.log('Files processed per directory:');
  for (const [directory, count] of Object.entries(directoryFileCounts)) {
    console.log(`${directory}: ${count}`);
  }

  console.log(`Ignored paths:\n${ignoredPaths.join('\n')}`); // Log ignored paths

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
