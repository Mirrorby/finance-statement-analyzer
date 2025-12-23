import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

// 🔴 КРИТИЧНО: инициализация worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const lines: Record<number, string[]> = {};

    content.items.forEach((item: any) => {
      const y = Math.round(item.transform[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push(item.str);
    });

    Object.keys(lines)
      .map(Number)
      .sort((a, b) => b - a)
      .forEach(y => {
        const line = lines[y].join(' ').replace(/\s+/g, ' ').trim();
        if (line) fullText += line + '\n';
      });

    fullText += '\n';
  }

  return fullText.trim();
}
