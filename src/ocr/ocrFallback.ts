import { createWorker, PSM } from 'tesseract.js';

// Колбэк для отслеживания прогресса (опционально)
type ProgressCallback = (progress: number, status: string) => void;

export async function ocrFallback(
  file: File,
  onProgress?: ProgressCallback
): Promise<string> {
  console.log('🔍 Запуск OCR для файла:', file.name);
  
  let worker;
  
  try {
    // Создаём worker с языками русский + английский
    worker = await createWorker('rus+eng', 1, {
      logger: (m) => {
        console.log(`OCR [${m.status}]: ${Math.round((m.progress || 0) * 100)}%`);
        if (onProgress) {
          onProgress(m.progress || 0, m.status);
        }
      }
    });

    // Настройка параметров распознавания для банковских выписок
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO, // Автоматическое определение структуры
      preserve_interword_spaces: '1'    // Сохраняем пробелы между словами
    });

    // Таймаут на случай зависания OCR (60 секунд)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OCR timeout: превышено время ожидания (60 сек)')), 60000);
    });

    // Распознавание с таймаутом
    const recognitionPromise = (async () => {
      const { data } = await worker.recognize(file);
      return data.text || '';
    })();

    const text = await Promise.race([recognitionPromise, timeoutPromise]);

    console.log(`✓ OCR завершён: извлечено ${text.length} символов`);
    
    return text;

  } catch (error: any) {
    console.error('❌ Ошибка OCR:', error);
    
    // Более информативные ошибки
    if (error.message.includes('timeout')) {
      throw new Error('OCR занял слишком много времени. Попробуйте файл меньшего размера.');
    } else if (error.message.includes('network')) {
      throw new Error('Не удалось загрузить OCR модели. Проверьте интернет-соединение.');
    } else {
      throw new Error(`Ошибка распознавания текста: ${error.message}`);
    }
    
  } finally {
    // Обязательно освобождаем ресурсы
    if (worker) {
      try {
        await worker.terminate();
        console.log('✓ OCR worker завершён');
      } catch (e) {
        console.warn('Не удалось корректно завершить OCR worker:', e);
      }
    }
  }
}
