import { parseBelinvestbank } from './belinvestbank';
import { parseBNB } from './bnb';

export function parse(text: string) {
  const a = parseBelinvestbank(text);
  const b = parseBNB(text);
  return a.length >= b.length ? a : b;
}
