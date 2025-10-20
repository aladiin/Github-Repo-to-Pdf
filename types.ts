export interface GitHubFile {
  path: string;
  content: string;
}

export interface GitHubTreeItem {
    path: string;
    mode: string;
    type: 'blob' | 'tree' | 'commit';
    sha: string;
    size?: number;
    url: string;
}

export interface GitHubTreeResponse {
    sha: string;
    url: string;
    tree: GitHubTreeItem[];
    truncated: boolean;
}

export interface GitHubBlobResponse {
    sha: string;
    node_id: string;
    size: number;
    url: string;
    content: string; // base64 encoded
    encoding: 'base64';
}

// New types for syntax highlighting
export interface HighlightedToken {
  text: string;
  color: string;
}

export interface HighlightedLine {
  tokens: HighlightedToken[];
}

export interface HighlightedFile {
  path: string;
  language: string;
  lines: HighlightedLine[];
}

export interface FormattedRepoData {
  title: string;
  tableOfContents: string[];
  files: HighlightedFile[];
}

export interface ProgressUpdate {
    message: string;
    fileProgress?: {
        current: number;
        total: number;
    };
}

export interface PdfOptions {
    font: 'Courier' | 'Helvetica' | 'Times';
    fontSize: number;
    lineSpacing: number;
    theme: 'light' | 'dark';
}
