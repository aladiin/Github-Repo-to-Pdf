import type { GitHubFile, GitHubTreeResponse, GitHubBlobResponse, ProgressUpdate } from '../types';
import { MAX_FILES_TO_PROCESS, MAX_FILE_SIZE_BYTES, TEXT_FILE_EXTENSIONS } from '../constants';

const GITHUB_API_BASE_URL = 'https://api.github.com';

export const parseRepoUrl = (url: string): { owner: string; repo: string } | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'github.com') {
      return null;
    }
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      return null;
    }
    const [owner, repo] = pathParts;
    return { owner, repo: repo.replace('.git', '') };
  } catch (error) {
    return null;
  }
};

const fetchGitHubAPI = async <T,>(endpoint: string): Promise<T> => {
    const response = await fetch(`${GITHUB_API_BASE_URL}${endpoint}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });
  
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repository not found. Please check the URL.');
      }
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please wait and try again later.');
      }
      throw new Error(`GitHub API request failed: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
};

export const getRepoFiles = async (owner: string, repo: string, onProgress: (update: ProgressUpdate) => void): Promise<GitHubFile[]> => {
    onProgress({ message: 'Fetching repository details...' });
    const repoData = await fetchGitHubAPI<{ default_branch: string }>(`/repos/${owner}/${repo}`);
    const defaultBranch = repoData.default_branch;

    onProgress({ message: `Fetching file tree for branch: ${defaultBranch}...` });
    const treeData = await fetchGitHubAPI<GitHubTreeResponse>(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
    
    const textFiles = treeData.tree.filter(item => 
        item.type === 'blob' &&
        item.size && item.size < MAX_FILE_SIZE_BYTES &&
        (TEXT_FILE_EXTENSIONS.some(ext => item.path.toLowerCase().endsWith(ext)) || TEXT_FILE_EXTENSIONS.includes(item.path.toLowerCase().split('/').pop() || ''))
    ).slice(0, MAX_FILES_TO_PROCESS);

    if (textFiles.length === 0) {
        throw new Error('No processable text files found in this repository.');
    }
    
    const totalFiles = textFiles.length;
    onProgress({ message: `Found ${totalFiles} files to process...`, fileProgress: { current: 0, total: totalFiles } });

    let processedCount = 0;
    const filePromises = textFiles.map(async (file): Promise<GitHubFile | null> => {
        try {
            const blob = await fetchGitHubAPI<GitHubBlobResponse>(`/repos/${owner}/${repo}/git/blobs/${file.sha}`);
            if (blob.encoding !== 'base64') return null;
            const content = atob(blob.content);
            return { path: file.path, content };
        } catch (error) {
            console.warn(`Failed to fetch content for ${file.path}:`, error);
            return null;
        } finally {
            processedCount++;
            onProgress({
                message: `Fetching content... (${processedCount}/${totalFiles})`,
                fileProgress: { current: processedCount, total: totalFiles }
            });
        }
    });

    const settledFiles = await Promise.all(filePromises);
    const validFiles = settledFiles.filter((file): file is GitHubFile => file !== null);
    
    return validFiles;
};
