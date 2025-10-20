
// List of text-based file extensions to include in the PDF.
// This helps filter out images, videos, and other binary files.
export const TEXT_FILE_EXTENSIONS = [
  '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss',
  '.py', '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rs', '.rb', '.php',
  '.yml', '.yaml', '.toml', '.ini', '.sh', '.bash', '.zsh', 'dockerfile',
  'license', '.gitignore', '.npmrc', '.eslintrc', '.prettierrc',
  '.xml', '.svg', '.env', '.env.local', '.env.development', '.env.production', 'readme'
];

// Maximum number of files to process to avoid huge PDFs and long processing times.
export const MAX_FILES_TO_PROCESS = 100;

// Maximum file size in bytes to process.
export const MAX_FILE_SIZE_BYTES = 100000; // 100 KB
