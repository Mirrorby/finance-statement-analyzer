import * as pdfjsLib from 'pdfjs-dist';
import { extractFromPdf } from './extractFromPdf';
import { extractFromTxt } from './extractFromTxt';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export async function extractText(file: File): Promise<string> {
  try {
    if (file.type !== 'application/pdf' && file.name.endsWith('.txt')) {
      return await extractFromTxt(file);
    }
    
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const pdfText = await extractFromPdf(file);
      
      if (pdfText && pdfText.trim().length > 0) {
        console.log(`✓ Извлечено ${pdfText.length} символов из PDF text layer`);
        return pdfText;
      }
      
      console.warn('⚠ PDF не содержит текстового слоя');
    }
    
    return '';
    
  } catch (error) {
    console.error('Ошибка извлечения текста:', error);
    throw new Error(`Не удалось обработать файл ${file.name}`);
  }
}
