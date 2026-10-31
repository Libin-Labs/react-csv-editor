export type CsvData = string[][];

export interface CsvOptions {
  delimiter?: string;
}

export interface SerializeCsvOptions extends CsvOptions {
  newline?: '\n' | '\r\n';
  bom?: boolean;
}

export function validateDelimiter(delimiter: string): void {
  if (delimiter.length !== 1 || /["\r\n\uFEFF\uD800-\uDFFF]/u.test(delimiter)) {
    throw new TypeError('Delimiter must be one non-quote, non-newline BMP character.');
  }
}

/** Strict quoting; a final line ending terminates a record, not an extra row. */
export function parseCsv(text: string, options: CsvOptions = {}): CsvData {
  const delimiter = options.delimiter ?? ',';
  validateDelimiter(delimiter);
  const source = text.startsWith('\uFEFF') ? text.slice(1) : text;
  if (!source) return [];
  const rows: CsvData = [];
  let row: string[] = [];
  let field = '';
  let state: 'start' | 'plain' | 'quoted' | 'closed' = 'start';
  let terminated = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    terminated = false;
    if (state === 'quoted') {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          state = 'closed';
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = '';
      state = 'start';
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      state = 'start';
      terminated = true;
    } else if (char === '"' && state === 'start') {
      state = 'quoted';
    } else if (char === '"' || state === 'closed') {
      throw new SyntaxError(`Invalid CSV quoting at offset ${i}.`);
    } else {
      field += char;
      state = 'plain';
    }
  }
  if (state === 'quoted') throw new SyntaxError('Unterminated quoted CSV field.');
  if (!terminated) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function serializeCsv(
  rows: readonly (readonly string[])[],
  options: SerializeCsvOptions = {},
): string {
  const delimiter = options.delimiter ?? ',';
  validateDelimiter(delimiter);
  const newline = options.newline ?? '\r\n';
  if (newline !== '\n' && newline !== '\r\n') {
    throw new TypeError('Newline must be LF or CRLF.');
  }
  const result = rows
    .map((row) => {
      if (row.length === 0) throw new TypeError('CSV rows must contain at least one field.');
      return row
        .map((field) => {
          if (typeof field !== 'string') throw new TypeError('CSV fields must be strings.');
          return field === '' || field.includes(delimiter) || /["\r\n\uFEFF]/u.test(field)
            ? `"${field.replace(/"/gu, '""')}"`
            : field;
        })
        .join(delimiter);
    })
    .join(newline);
  return (options.bom ? '\uFEFF' : '') + result;
}
