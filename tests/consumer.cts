import csv = require('@lp-labs/react-csv-editor');
import { createElement } from 'react';

const options: csv.SerializeCsvOptions = { bom: true };
const rows: csv.CsvData = csv.parseCsv('a,b');
const props: csv.CsvEditorProps = { value: rows, onChange: () => undefined };
createElement(csv.CsvEditor, props);
csv.serializeCsv(rows, options);
csv.validateDelimiter(',');
