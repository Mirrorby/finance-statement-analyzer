import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

import { extractFromPdf } from './extractFromPdf';
import { extractFromTxt } from './extractFromTxt';
import { ocrFallback } from '../ocr/ocrFallback';

// Инициализация worker (обязательно)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractText(file: File): Promise<string> {
  // TXT
  if (file.type !== 'application/pdf') {
    return extractFromTxt(file);
  }

  // PDF → text layer
  const pdfText = await extractFromPdf(file);

  // ⚠️ ВАЖНО:
  // НЕ проверяем длину текста
  // возвращаем как есть
  if (pdfText && pdfText.trim().length > 0) {
    return pdfText;
  }

  // fallback → OCR
  return await ocrFallback(file);
}
