export async function extractFromTxt(file: File): Promise<string> {
  return await file.text();
}
