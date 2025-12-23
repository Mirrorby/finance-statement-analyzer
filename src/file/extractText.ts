import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

import { extractFromPdf } from './extractFromPdf';
import { extractFromTxt } from './extractFromTxt';
import { ocrFallback } from '../ocr/ocrFallback';

// 🔧 КРИТИЧНО: явная инициализация worker для Vite / Vercel
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractText(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    const text = await extractFromPdf(file);

    // fallback на OCR только если PDF без текстового слоя
    if (text.trim().length < 300) {
      return await ocrFallback(file);
    }

    return text;
  }

  return extractFromTxt(file);
}
