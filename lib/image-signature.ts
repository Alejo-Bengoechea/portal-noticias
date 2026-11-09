export function validImageSignature(bytes: Uint8Array, type: string) {
  const starts = (...values: number[]) => values.every((value, i) => bytes[i] === value);
  if (type === 'image/jpeg') return starts(0xff, 0xd8, 0xff);
  if (type === 'image/png') return starts(137, 80, 78, 71, 13, 10, 26, 10);
  const text = (start: number, end: number) => new TextDecoder().decode(bytes.slice(start, end));
  if (type === 'image/webp') return text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP';
  if (type === 'image/avif') return text(4, 8) === 'ftyp' && /avif|avis/.test(text(8, 64));
  return false;
}
