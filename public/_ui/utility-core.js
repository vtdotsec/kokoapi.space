export function cleanText(input, { trim = true, removeEmpty = true, unique = true } = {}) {
  if (input.length > 2_000_000) throw new Error('Please use at most 2 million characters.');
  let lines = input.replace(/\r\n?/g, '\n').split('\n');
  if (trim) lines = lines.map(line => line.trim());
  if (removeEmpty) lines = lines.filter(line => line.trim().length > 0);
  if (unique) lines = [...new Set(lines)];
  return lines.join('\n');
}

export function signature(bytes) {
  const starts = (...prefix) => prefix.every((value, index) => bytes[index] === value);
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'PDF';
  if (starts(137, 80, 78, 71, 13, 10, 26, 10)) return 'PNG';
  if (starts(255, 216, 255)) return 'JPEG';
  if (starts(71, 73, 70, 56, 55, 97) || starts(71, 73, 70, 56, 57, 97)) return 'GIF';
  if (starts(80, 75, 3, 4) || starts(80, 75, 5, 6) || starts(80, 75, 7, 8)) return 'ZIP container (also used by DOCX, XLSX and EPUB)';
  if (starts(31, 139)) return 'GZIP';
  if (starts(55, 122, 188, 175, 39, 28)) return '7-Zip';
  if (starts(73, 73, 42, 0) || starts(77, 77, 0, 42)) return 'TIFF';
  if (starts(82, 73, 70, 70) && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) return 'WebP';
  if (starts(0, 97, 115, 109)) return 'WebAssembly';
  return 'Not recognized — may be text or an unsupported format';
}

export async function sha256(buffer) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
