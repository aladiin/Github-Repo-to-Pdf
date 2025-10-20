import { GoogleGenAI, Type } from "@google/genai";
import type { GitHubFile, FormattedRepoData, HighlightedFile, ProgressUpdate } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Schema for a single highlighted file, to be requested one by one.
const highlightedFileSchema = {
    type: Type.OBJECT,
    properties: {
        path: { type: Type.STRING },
        language: { type: Type.STRING },
        lines: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    tokens: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING },
                                color: { type: Type.STRING },
                            },
                            required: ['text', 'color'],
                        }
                    }
                },
                required: ['tokens'],
            }
        }
    },
    required: ['path', 'language', 'lines'],
};

// Schema for the initial call to get title and table of contents.
const repoStructureSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        tableOfContents: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
    },
    required: ['title', 'tableOfContents'],
};

const cleanupJsonResponse = (text: string): string => {
    // The model might wrap the JSON in markdown backticks. This removes them.
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
        return jsonMatch[1];
    }
    // As a fallback, find the first '{' and the last '}' to extract the JSON object.
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        return text.substring(firstBrace, lastBrace + 1);
    }
    return text;
};

const createHighlightPrompt = (file: GitHubFile): string => `
You are an expert code syntax highlighter. Your task is to convert a file's content into a structured JSON object for a syntax-highlighted PDF.

File Path: ${file.path}
File Content:
\`\`\`
${file.content}
\`\`\`

CRITICAL INSTRUCTIONS:
- The entire output MUST be a single, valid JSON object matching the schema. Do not include any text or markdown before or after the JSON.
- **JSON STRING ESCAPING**: You MUST correctly escape all special characters within string values. For example, a double quote (") must be escaped as \\", and a backslash (\\) must be escaped as \\\\. This is vital for JSON validity.
- Use a color scheme for a white PDF background with dark, distinct colors:
  - Keywords (const, function, if): #800080 (purple)
  - Strings: #D2691E (chocolate)
  - Numbers: #008000 (green)
  - Comments: #696969 (dim gray)
  - Punctuation (, ; .): #000000 (black)
  - Variables, Properties: #0000FF (blue)
  - Default/unrecognized: #000000 (black)
- Analyze the content to determine its programming language (e.g., 'javascript', 'python').
- Split content into lines, then each line into tokens. Spaces between tokens should be their own tokens to preserve formatting.
- Ensure the 'path' in your response matches the provided path exactly: "${file.path}".
`;

export const formatRepoForPdf = async (
    repoName: string, 
    files: GitHubFile[], 
    onProgress: (update: ProgressUpdate) => void
): Promise<FormattedRepoData> => {
    // Using the 'flash' model for speed, as syntax highlighting is a less complex task.
    const model = 'gemini-2.5-flash';
    
    // Step 1: Get Title and Table of Contents using just the file paths.
    onProgress({ message: 'AI: Generating document structure...' });
    const filePaths = files.map(f => f.path);
    const structurePrompt = `
You are a technical writer. Based on the file list from the repository "${repoName}", generate a suitable title and a table of contents.
The title should be descriptive, like "Code Documentation for ${repoName}".
The table of contents should be an array of the file paths I provide.
Return a single, valid JSON object that adheres to the provided schema.

File paths: ${JSON.stringify(filePaths)}
`;

    const structureResponse = await ai.models.generateContent({
        model,
        contents: structurePrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: repoStructureSchema,
        },
    });
    
    const structureData = JSON.parse(cleanupJsonResponse(structureResponse.text));

    // Step 2: Process all files concurrently for maximum speed.
    const highlightedFiles: HighlightedFile[] = [];
    const totalFiles = files.length;
    let processedCount = 0;
    
    onProgress({
        message: `AI: Analyzing ${totalFiles} files...`,
        fileProgress: { current: 0, total: totalFiles }
    });

    const fileHighlightPromises = files.map(file => 
        ai.models.generateContent({
            model,
            contents: createHighlightPrompt(file),
            config: {
                responseMimeType: "application/json",
                responseSchema: highlightedFileSchema,
            },
        }).then(response => {
            try {
                const responseText = cleanupJsonResponse(response.text);
                return JSON.parse(responseText) as HighlightedFile;
            } catch (error) {
                console.warn(`Skipping file ${file.path} due to a JSON parsing error:`, error);
                return null;
            }
        }).catch(error => {
            console.warn(`Skipping file ${file.path} due to an API call failure:`, error);
            return null;
        }).finally(() => {
            processedCount++;
            onProgress({
                message: 'AI: Analyzing files...',
                fileProgress: { current: processedCount, total: totalFiles }
            });
        })
    );

    const settledResults = await Promise.all(fileHighlightPromises);

    settledResults.forEach(result => {
        if (result) {
            highlightedFiles.push(result);
        }
    });

    if (highlightedFiles.length === 0 && files.length > 0) {
        throw new Error("The AI failed to process any of the repository files. This might be a temporary issue.");
    }

    // Sort files to match the order in the table of contents, as parallel processing can finish out of order.
    const sortedHighlightedFiles = highlightedFiles.sort((a, b) => {
        const indexA = structureData.tableOfContents.indexOf(a.path);
        const indexB = structureData.tableOfContents.indexOf(b.path);
        return indexA - indexB;
    });

    return {
        title: structureData.title,
        tableOfContents: structureData.tableOfContents,
        files: sortedHighlightedFiles,
    };
};