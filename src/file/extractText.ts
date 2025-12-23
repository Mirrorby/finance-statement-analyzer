import { extractFromPdf } from './extractFromPdf';
import { extractFromTxt } from './extractFromTxt';
import { ocrFallback } from '../ocr/ocrFallback';

export async function extractText(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    const text = await extractFromPdf(file);
    if (text.length < 300) {
      return await ocrFallback(file);
    }
    return text;
  }
  return extractFromTxt(file);
}
