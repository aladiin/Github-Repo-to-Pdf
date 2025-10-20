import React, { useState } from 'react';
import { getRepoFiles, parseRepoUrl } from './services/github';
import { formatRepoForPdf } from './services/gemini';
import { generateRepoPdf } from './services/pdf';
import { GithubIcon, FilePdfIcon, LoaderIcon, CheckCircleIcon, CodeIcon, ListTreeIcon, DownloadCloudIcon, SettingsIcon, SunIcon, MoonIcon } from './components/icons';
import type { ProgressUpdate, PdfOptions } from './types';

interface RepoFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

const RepoForm: React.FC<RepoFormProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    if (newUrl.trim() === '') {
      setUrlError(null);
    } else {
      const parsed = parseRepoUrl(newUrl);
      if (!parsed) {
        setUrlError("Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo).");
      } else {
        setUrlError(null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setUrlError("URL cannot be empty.");
      return;
    }
    
    if (!isLoading && !urlError) {
      onSubmit(url);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <style>{`
          @keyframes fade-in-short {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-short { animation: fade-in-short 0.3s ease-out forwards; }
        `}</style>
      <div className="relative">
        <GithubIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={url}
          onChange={handleUrlChange}
          placeholder="e.g., https://github.com/facebook/react"
          className={`w-full pl-12 pr-40 py-4 text-slate-200 bg-slate-800 border rounded-lg outline-none transition-all duration-300 ${
            urlError
              ? 'border-red-500 ring-2 ring-red-500/50'
              : 'border-slate-700 focus:ring-2 focus:ring-sky-500 focus:border-sky-500'
          }`}
          disabled={isLoading}
          aria-invalid={!!urlError}
          aria-describedby="url-error"
        />
        <button
          type="submit"
          disabled={isLoading || !!urlError || !url.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-sky-600 text-white px-6 py-2.5 rounded-md font-semibold flex items-center justify-center gap-2 hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-300"
        >
          {isLoading ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <FilePdfIcon className="h-5 w-5" />}
          <span>{isLoading ? 'Generating...' : 'Generate'}</span>
        </button>
      </div>
      {urlError && (
        <p id="url-error" className="mt-2 text-sm text-red-400 text-left animate-fade-in-short" role="alert">
          {urlError}
        </p>
      )}
    </form>
  );
};

interface PdfOptionsProps {
    options: PdfOptions;
    setOptions: React.Dispatch<React.SetStateAction<PdfOptions>>;
}

const PdfCustomizationOptions: React.FC<PdfOptionsProps> = ({ options, setOptions }) => {
    const commonSelectClass = "bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors";
    const commonLabelClass = "block text-sm font-medium text-slate-400 mb-1 text-left";
    
    return (
        <div className="w-full max-w-2xl grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div>
                <label htmlFor="pdf-font" className={commonLabelClass}>Font</label>
                <select 
                    id="pdf-font"
                    value={options.font}
                    onChange={(e) => setOptions(prev => ({...prev, font: e.target.value as PdfOptions['font']}))}
                    className={commonSelectClass + " w-full"}
                >
                    <option value="Courier">Courier</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times">Times</option>
                </select>
            </div>
            <div>
                <label htmlFor="pdf-font-size" className={commonLabelClass}>Font Size</label>
                <select 
                    id="pdf-font-size"
                    value={options.fontSize}
                    onChange={(e) => setOptions(prev => ({...prev, fontSize: parseInt(e.target.value)}))}
                    className={commonSelectClass + " w-full"}
                >
                    <option value="8">Small</option>
                    <option value="9">Medium</option>
                    <option value="10">Large</option>
                </select>
            </div>
            <div>
                <label htmlFor="pdf-line-spacing" className={commonLabelClass}>Line Spacing</label>
                <select 
                    id="pdf-line-spacing"
                    value={options.lineSpacing}
                    onChange={(e) => setOptions(prev => ({...prev, lineSpacing: parseFloat(e.target.value)}))}
                    className={commonSelectClass + " w-full"}
                >
                    <option value="1.0">Compact</option>
                    <option value="1.15">Normal</option>
                    <option value="1.5">Spacious</option>
                </select>
            </div>
            <div>
                <label className={commonLabelClass}>Theme</label>
                <div className="flex bg-slate-700 rounded-md p-1">
                    <button 
                        onClick={() => setOptions(prev => ({...prev, theme: 'light'}))}
                        aria-pressed={options.theme === 'light'}
                        className={`w-1/2 flex items-center justify-center gap-2 py-1 rounded-md transition-colors ${options.theme === 'light' ? 'bg-sky-600 text-white' : 'hover:bg-slate-600 text-slate-300'}`}
                    >
                        <SunIcon className="h-4 w-4" /> Light
                    </button>
                    <button 
                        onClick={() => setOptions(prev => ({...prev, theme: 'dark'}))}
                        aria-pressed={options.theme === 'dark'}
                        className={`w-1/2 flex items-center justify-center gap-2 py-1 rounded-md transition-colors ${options.theme === 'dark' ? 'bg-sky-600 text-white' : 'hover:bg-slate-600 text-slate-300'}`}
                    >
                        <MoonIcon className="h-4 w-4" /> Dark
                    </button>
                </div>
            </div>
        </div>
    );
};


const PROGRESS_STEPS = [
  { name: 'Parsing URL', details: 'Validating the GitHub repository link.' },
  { name: 'Fetching File Tree', details: 'Getting the list of all files from the repository.' },
  { name: 'Fetching File Contents', details: 'Downloading the contents of each relevant file.' },
  { name: 'AI Structuring', details: 'AI is analyzing and adding syntax highlighting to the code.' },
  { name: 'Generating PDF', details: 'Assembling the final PDF document.' },
  { name: 'Done!', details: 'Your PDF is ready for download.' },
];

interface ProgressState {
  stepIndex: number;
  fileCurrent: number;
  fileTotal: number;
  stepDetails: string;
}

interface ProgressTrackerProps {
  progress: ProgressState;
  repoName: string | null;
  pdfBlob: Blob | null;
  onReset: () => void;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ progress, repoName, pdfBlob, onReset }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const isDone = progress.stepIndex === PROGRESS_STEPS.length - 1 && pdfBlob;

  const handleDownload = () => {
    if (!pdfBlob || !repoName || isDownloading) return;
    
    setIsDownloading(true);

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Reset button state after a short delay to give user feedback
    setTimeout(() => {
        setIsDownloading(false);
    }, 3000);
  };

  if (isDone) {
    return (
      <div className="w-full max-w-2xl text-center flex flex-col items-center justify-center p-6 bg-slate-800/50 border border-slate-700 rounded-lg transition-opacity duration-500 animate-fade-in">
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        `}</style>
        <CheckCircleIcon className="h-12 w-12 text-green-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-100">Success!</h2>
        <p className="text-slate-300 mt-2 mb-6">Your repository PDF is ready for download.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-sky-600 text-white px-8 py-3 rounded-md font-semibold flex items-center justify-center gap-2 hover:bg-sky-500 transition-colors duration-300 disabled:bg-sky-800 disabled:cursor-wait w-48"
          >
            {isDownloading ? (
                <>
                    <LoaderIcon className="h-5 w-5 animate-spin" />
                    <span>Downloading...</span>
                </>
            ) : (
                <>
                    <DownloadCloudIcon className="h-5 w-5" />
                    <span>Download PDF</span>
                </>
            )}
          </button>
          <button
            onClick={onReset}
            className="bg-slate-700 text-slate-300 px-8 py-3 rounded-md font-semibold hover:bg-slate-600 transition-colors duration-300"
          >
            Generate Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl text-center">
      <div className="flex items-center justify-center gap-4 mb-4">
        <LoaderIcon className="h-10 w-10 animate-spin text-sky-400" />
        <h2 className="text-2xl font-bold text-slate-100">{PROGRESS_STEPS[progress.stepIndex].name}</h2>
      </div>
      <p className="text-slate-400 mb-6">{progress.stepDetails}</p>

      <div className="w-full bg-slate-700 rounded-full h-2.5">
        <div 
            className="bg-sky-500 h-2.5 rounded-full transition-all duration-500" 
            style={{ width: `${(progress.stepIndex / (PROGRESS_STEPS.length - 2)) * 100}%` }}
        ></div>
      </div>
      
      {(progress.stepIndex === 2 || progress.stepIndex === 3) && progress.fileTotal > 0 && (
        <div className="mt-4">
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(progress.fileCurrent / progress.fileTotal) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-500 text-right mt-1">{progress.fileCurrent} / {progress.fileTotal} files</p>
        </div>
      )}
    </div>
  );
};

interface AppError {
    title: string;
    message: string;
}

const ErrorMessage: React.FC<{ error: AppError; onClear: () => void }> = ({ error, onClear }) => (
    <div className="bg-red-900/50 border border-red-700 text-red-300 px-6 py-5 rounded-lg relative mt-8 max-w-2xl w-full text-left transition-opacity duration-500 animate-fade-in" role="alert">
         <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        `}</style>
        <h3 className="font-bold text-lg text-red-200 mb-2">{error.title}</h3>
        <p className="text-red-300">{error.message}</p>
        <div className="mt-4">
            <button 
                onClick={onClear}
                className="bg-slate-700 text-slate-300 px-4 py-2 rounded-md font-semibold hover:bg-slate-600 transition-colors duration-300"
            >
                Start Over
            </button>
        </div>
    </div>
);

const Feature: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex flex-col items-center md:items-start text-center md:text-left">
        <div className="bg-sky-500/10 p-3 rounded-full border border-sky-800 mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-100">{title}</h3>
        <p className="mt-2 text-slate-400">{children}</p>
    </div>
);


function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [repoName, setRepoName] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<PdfOptions>({
      font: 'Courier',
      fontSize: 9,
      lineSpacing: 1.15,
      theme: 'light',
  });


  const handleReset = () => {
    setIsLoading(false);
    setProgress(null);
    setError(null);
    setPdfBlob(null);
    setRepoName(null);
  };

  const handleSubmit = async (repoUrl: string) => {
    handleReset();
    setIsLoading(true);
    setProgress({ 
        stepIndex: 0, 
        fileCurrent: 0, 
        fileTotal: 0, 
        stepDetails: PROGRESS_STEPS[0].details 
    });

    try {
      const repoInfo = parseRepoUrl(repoUrl);
      if (!repoInfo) {
        throw new Error('Invalid GitHub repository URL.');
      }
      const { owner, repo } = repoInfo;
      setRepoName(repo);
      
      setProgress(prev => ({ ...prev!, stepIndex: 1, stepDetails: PROGRESS_STEPS[1].details }));
      
      const onFetchProgressUpdate = (update: ProgressUpdate) => {
          setProgress(prev => ({
              ...prev!,
              stepIndex: 2,
              stepDetails: update.message || PROGRESS_STEPS[2].details,
              fileCurrent: update.fileProgress?.current || prev!.fileCurrent,
              fileTotal: update.fileProgress?.total || prev!.fileTotal,
          }));
      };
      
      const files = await getRepoFiles(owner, repo, onFetchProgressUpdate);
      
      setProgress(prev => ({ 
        ...prev!, 
        stepIndex: 3, 
        stepDetails: PROGRESS_STEPS[3].details,
        fileCurrent: 0,
        fileTotal: 0,
    }));

      const onAiProgressUpdate = (update: ProgressUpdate) => {
          setProgress(prev => {
              if (prev?.stepIndex !== 3) return prev;
              return {
                ...prev!,
                stepDetails: update.message,
                fileCurrent: update.fileProgress?.current || prev.fileCurrent,
                fileTotal: update.fileProgress?.total || prev.fileTotal,
              };
          });
      };
      
      const formattedContent = await formatRepoForPdf(repo, files, onAiProgressUpdate);

      setProgress(prev => ({ ...prev!, stepIndex: 4, stepDetails: PROGRESS_STEPS[4].details }));
      const blob = generateRepoPdf(repo, formattedContent, pdfOptions);
      setPdfBlob(blob);
      
      setProgress(prev => ({ ...prev!, stepIndex: 5, stepDetails: PROGRESS_STEPS[5].details }));

    } catch (err: unknown) {
        let newError: AppError = { title: 'An Unexpected Error Occurred', message: 'Something went wrong.' };
        if (err instanceof Error) {
            const errorMessage = err.message.toLowerCase();
            if (errorMessage.includes('rate limit')) {
                newError = { title: 'Rate Limit Exceeded', message: 'You have made too many requests to the GitHub API. Please wait a few minutes and try again.' };
            } else if (errorMessage.includes('not found')) {
                newError = { title: 'Repository Not Found', message: 'Please double-check the URL and ensure the repository is public and correctly spelled.' };
            } else if (errorMessage.includes('invalid github repository url')) {
                newError = { title: 'Invalid URL', message: 'The URL provided does not seem to be a valid GitHub repository link. Please check for typos.' };
            } else if (errorMessage.includes('ai failed to process')) {
                newError = { title: 'AI Processing Error', message: 'The AI could not process the repository files. This can happen with very large or unusual files. Please try again in a moment.' };
            } else {
                newError.message = err.message;
            }
        }
        setError(newError);
        setProgress(null);
        setPdfBlob(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const showResults = !!pdfBlob;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
        <div className="text-center">
            <div className="mb-4 inline-block bg-sky-500/10 p-3 rounded-full border border-sky-800">
            <FilePdfIcon className="h-10 w-10 text-sky-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-100">GitHub Repo to PDF</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-400">
            Paste a public GitHub repository URL. Our AI will analyze the code, add syntax highlighting, and generate a clean, readable PDF document for you.
            </p>
        </div>
        
        <div className="mt-10 w-full flex flex-col items-center gap-4">
          {!isLoading && !showResults && !error && (
             <div className="w-full flex flex-col items-center gap-4">
                <RepoForm onSubmit={handleSubmit} isLoading={isLoading} />
                <div className="w-full max-w-2xl">
                    <button 
                        onClick={() => setShowOptions(!showOptions)}
                        className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-sky-400 transition-colors py-2 text-sm"
                        aria-expanded={showOptions}
                    >
                        <SettingsIcon className="h-4 w-4" />
                        <span>{showOptions ? 'Hide' : 'Customize'} PDF Options</span>
                    </button>
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showOptions ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                        <PdfCustomizationOptions options={pdfOptions} setOptions={setPdfOptions} />
                    </div>
                </div>
            </div>
          )}
        </div>

        <div className="mt-8 h-48 w-full flex items-center justify-center">
            {(isLoading || showResults) && progress && !error && (
                <ProgressTracker 
                    progress={progress} 
                    repoName={repoName} 
                    pdfBlob={pdfBlob} 
                    onReset={handleReset} 
                />
            )}
            {error && !isLoading && <ErrorMessage error={error} onClear={handleReset} />}
        </div>

        {!isLoading && !showResults && !error && (
            <div className="w-full max-w-4xl mt-12 border-t border-slate-800 pt-12 grid grid-cols-1 md:grid-cols-3 gap-12">
                <Feature icon={<CodeIcon className="h-6 w-6 text-sky-400" />} title="Syntax Highlighting">
                    Code is beautifully formatted and colored based on language, making it easy to read and understand, just like in your favorite editor.
                </Feature>
                <Feature icon={<ListTreeIcon className="h-6 w-6 text-sky-400" />} title="AI-Powered Structure">
                    Gemini intelligently structures the repository, creating a title page and a clickable table of contents for easy navigation.
                </Feature>
                <Feature icon={<FilePdfIcon className="h-6 w-6 text-sky-400" />} title="Smart File Filtering">
                    Automatically selects relevant text-based files and ignores images, videos, and binaries, keeping your PDF focused on the code.
                </Feature>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
