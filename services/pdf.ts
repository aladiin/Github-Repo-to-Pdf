import { jsPDF } from "jspdf";
import type { FormattedRepoData, PdfOptions } from '../types';

// Theme colors
const DARK_MODE_BACKGROUND = '#1E293B'; // slate-800
const DARK_MODE_TEXT = '#E2E8F0'; // slate-200
const LIGHT_MODE_TEXT = '#000000';

export const generateRepoPdf = (repoName: string, data: FormattedRepoData, options: PdfOptions): Blob => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const MARGIN = 15;
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const isDarkMode = options.theme === 'dark';
  const FONT_NAME = options.font;
  const FONT_SIZE = options.fontSize;
  const LINE_HEIGHT = FONT_SIZE * 0.5 * options.lineSpacing; // Base line height on font size and spacing multiplier
  const defaultTextColor = isDarkMode ? DARK_MODE_TEXT : LIGHT_MODE_TEXT;

  const addPageBackground = () => {
    if (isDarkMode) {
      doc.setFillColor(DARK_MODE_BACKGROUND);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    }
  };

  const checkNewPage = (neededHeight: number = 0) => {
    if (y + neededHeight > pageHeight - MARGIN) {
      doc.addPage();
      addPageBackground();
      y = MARGIN;
    }
  };

  // Initial page setup
  addPageBackground();
  doc.setTextColor(defaultTextColor);

  // 1. Title Page
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(24);
  const titleLines = doc.splitTextToSize(data.title, contentWidth);
  checkNewPage(titleLines.length * 12);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 12 + 10;
  
  doc.setTextColor(defaultTextColor); // Reset text color after title

  // 2. Table of Contents
  checkNewPage(20);
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(16);
  doc.text("Table of Contents", MARGIN, y);
  y += 8;

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(FONT_SIZE);
  for (const path of data.tableOfContents) {
    const pathLines = doc.splitTextToSize(path, contentWidth);
    checkNewPage(pathLines.length * LINE_HEIGHT);
    doc.text(pathLines, MARGIN, y);
    y += pathLines.length * LINE_HEIGHT;
  }

  // 3. File Contents
  data.files.forEach(file => {
    y += 10;
    checkNewPage(20);
    doc.setTextColor(defaultTextColor);

    // File separator
    doc.setFont(FONT_NAME, "bold");
    doc.setFontSize(12);
    const separator = `File: ${file.path} (${file.language})`;
    const separatorLines = doc.splitTextToSize(separator, contentWidth);
    doc.text(separatorLines, MARGIN, y);
    y += separatorLines.length * 6 + 4;

    doc.setFont(FONT_NAME, "normal");
    doc.setFontSize(FONT_SIZE);

    file.lines.forEach(line => {
      checkNewPage(LINE_HEIGHT);
      let x = MARGIN;
      
      if (line.tokens.length === 0) {
        y += LINE_HEIGHT;
        return;
      }
      
      line.tokens.forEach(token => {
        let color = token.color;
        // Adjust color for dark mode if it's black or too dark
        if (isDarkMode && (color === '#000000' || color === 'black')) {
          color = DARK_MODE_TEXT;
        } else if (!isDarkMode && (color === '#FFFFFF' || color === 'white')) {
            // Prevent white text on white background
            color = LIGHT_MODE_TEXT;
        }

        // Basic check for valid hex color
        color = /^#[0-9A-F]{6}$/i.test(color) ? color : defaultTextColor;
        doc.setTextColor(color);
        
        const tokenWidth = doc.getTextWidth(token.text);
        
        if (x > MARGIN && (x + tokenWidth) > (pageWidth - MARGIN)) {
            y += LINE_HEIGHT;
            checkNewPage(LINE_HEIGHT);
            x = MARGIN;
        }
        
        doc.text(token.text, x, y);
        x += tokenWidth;
      });
      y += LINE_HEIGHT;
    });
  });

  return doc.output('blob');
};
