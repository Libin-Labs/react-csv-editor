import { createElement } from 'react';
import { CsvEditor, parseCsv, serializeCsv, validateDelimiter } from '@lp-labs/react-csv-editor';
import type {
  CsvData,
  CsvEditorProps,
  CsvOptions,
  SerializeCsvOptions,
} from '@lp-labs/react-csv-editor';

const options: CsvOptions = { delimiter: ';' };
const output: SerializeCsvOptions = { ...options, newline: '\n', bom: true };
const data: CsvData = parseCsv('a;b', options);
const props: CsvEditorProps = {
  value: data,
  onChange: (rows) => {
    rows[0][0] = 'ok';
  },
  onExport: (text) => {
    text.toUpperCase();
  },
};
createElement(CsvEditor, props);
serializeCsv(data, output);
validateDelimiter(',');
// @ts-expect-error Cells are strings, not numbers.
serializeCsv([[42]]);
// @ts-expect-error Only LF and CRLF are supported.
serializeCsv(data, { newline: '\r' });
