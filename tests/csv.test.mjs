import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { parseCsv, serializeCsv, validateDelimiter } from '../dist/esm/index.js';

test('parses BOM, delimiters, escaped quotes, and embedded CRLF', () => {
  assert.deepEqual(
    parseCsv('\uFEFFname;note\r\n"A;B";"said ""yes""\r\nnext"\r\n', { delimiter: ';' }),
    [
      ['name', 'note'],
      ['A;B', 'said "yes"\r\nnext'],
    ],
  );
});

test('handles empty fields, blank records, trailing separators and mixed record endings', () => {
  assert.deepEqual(parseCsv(''), []);
  assert.deepEqual(parseCsv('\uFEFF'), []);
  assert.deepEqual(parseCsv('\n'), [['']]);
  assert.deepEqual(parseCsv('a,\r\n\rx\n'), [['a', ''], [''], ['x']]);
  assert.deepEqual(parseCsv('""'), [['']]);
});

test('rejects malformed quotes and invalid delimiters', () => {
  for (const text of ['"open', 'a"b', '"a"x', '"a" ,b'])
    assert.throws(() => parseCsv(text), SyntaxError);
  for (const delimiter of ['', '||', '"', '\r', '\n', '\uFEFF', '\uD800']) {
    assert.throws(() => validateDelimiter(delimiter), TypeError);
    assert.throws(() => serializeCsv([['a']], { delimiter }), TypeError);
  }
});

test('round-trips ragged records, whitespace, delimiters, quotes, and empty records', () => {
  const rows = [[''], ['a', 'two\nlines', 'a"b', ' ', ';'], ['last', '']];
  for (const delimiter of [',', ';', '\t', '|']) {
    for (const newline of ['\n', '\r\n']) {
      const text = serializeCsv(rows, { delimiter, newline, bom: true });
      assert.equal(text.charCodeAt(0), 0xfeff);
      assert.deepEqual(parseCsv(text, { delimiter }), rows);
    }
  }
  assert.throws(() => serializeCsv([[]]), TypeError);
  assert.throws(() => serializeCsv([[4]]), TypeError);
  assert.throws(() => serializeCsv([['x']], { newline: '\r' }), TypeError);
  assert.deepEqual(parseCsv(serializeCsv([['\uFEFFcontent']])), [['\uFEFFcontent']]);
});

test('does not mutate inputs or claim spreadsheet formula protection', () => {
  const rows = Object.freeze([Object.freeze(['=1+1', '+SUM(A1)', '@x', '-4'])]);
  assert.equal(serializeCsv(rows), '=1+1,+SUM(A1),@x,-4');
  assert.deepEqual(parseCsv(serializeCsv(rows)), rows);
});

test('ESM and CommonJS expose the same functions', () => {
  const require = createRequire(import.meta.url);
  const cjs = require('../dist/cjs/index.js');
  assert.deepEqual(
    Object.keys(cjs).sort(),
    ['CsvEditor', 'parseCsv', 'serializeCsv', 'validateDelimiter'].sort(),
  );
  assert.deepEqual(cjs.parseCsv('x,"y,z"'), parseCsv('x,"y,z"'));
});
