import * as pdfjsLib from 'pdfjs-dist';
import { extractFromPdf } from './extractFromPdf';
import { extractFromTxt } from './extractFromTxt';

// Используем локальный worker из папки public
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export async function extractText(file: File): Promise<string> {
  try {
    // TXT файлы
    if (file.type !== 'application/pdf' && file.name.endsWith('.txt')) {
      return await extractFromTxt(file);
    }
    
    // PDF → пробуем извлечь текстовый слой
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const pdfText = await extractFromPdf(file);
      
      // Возвращаем текст, если он есть
      if (pdfText && pdfText.trim().length > 0) {
        console.log(`✓ Извлечено ${pdfText.length} символов из PDF text layer`);
        return pdfText;
      }
      
      console.warn('⚠ PDF не содержит текстового слоя');
    }
    
    // Если это неизвестный формат
    return '';
    
  } catch (error) {
    console.error('Ошибка извлечения текста:', error);
    throw new Error(`Не удалось обработать файл ${file.name}`);
  }
}
```

---

### 3. Исправить `.gitignore` (если нужно)

**В файле `.gitignore` добавьте строку:**
```
!public/pdf.worker.min.mjs
