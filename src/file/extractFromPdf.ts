import * as pdfjsLib from 'pdfjs-dist/build/pdf';

export async function extractFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // группируем элементы по строкам (Y-координата)
    const lines: Record<string, string[]> = {};

    content.items.forEach((item: any) => {
      const y = Math.round(item.transform[5]); // вертикальная позиция
      if (!lines[y]) lines[y] = [];
      lines[y].push(item.str);
    });

    // сортируем строки сверху вниз
    const sortedLines = Object.keys(lines)
      .map(Number)
      .sort((a, b) => b - a);

    for (const y of sortedLines) {
      const line = lines[y]
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (line) {
        fullText += line + '\n';
      }
    }

    fullText += '\n';
  }

  return fullText.trim();
}
