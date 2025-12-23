import { createWorker } from 'tesseract.js';

export async function ocrFallback(file: File): Promise<string> {
  const worker = await createWorker('rus+eng');
  const { data } = await worker.recognize(file);
  await worker.terminate();
  return data.text || '';
}
