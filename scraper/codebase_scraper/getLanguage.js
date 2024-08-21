const path = require('path');

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

function getLanguage(filePath) {
  const ext = path.extname(filePath);

  return languageMap[ext] || 'Unknown';
}

exports.getLanguage = getLanguage;