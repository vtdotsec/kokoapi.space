import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256, signature, cleanText } from '../public/_ui/utility-core.js';

test('SHA-256 matches published empty and abc vectors', async () => {
  assert.equal(await sha256(new TextEncoder().encode('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(await sha256(new Uint8Array()), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});
test('text cleanup preserves order and case, normalizes line endings and supports opt-outs', () => {
  assert.equal(cleanText(' alpha \r\n\r\nalpha\rbeta\nBeta\n'), 'alpha\nbeta\nBeta');
  assert.equal(cleanText(' a \r\n a ', { trim: false, removeEmpty: false, unique: false }), ' a \n a ');
  assert.equal(cleanText(''), '');
  assert.throws(() => cleanText('a'.repeat(2_000_001)), /2 million/);
});
test('signatures recognize binary containers and leave unknown inputs unclassified', () => {
  assert.equal(signature(Uint8Array.from([137,80,78,71,13,10,26,10])), 'PNG');
  assert.equal(signature(new TextEncoder().encode('%PDF-1.7')), 'PDF');
  assert.match(signature(Uint8Array.from([80,75,3,4])), /ZIP container/);
  assert.equal(signature(Uint8Array.from([137,80])), 'Not recognized — may be text or an unsupported format');
});
