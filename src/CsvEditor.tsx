import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { parseCsv, serializeCsv, validateDelimiter } from './csv.js';
import type { CsvData, SerializeCsvOptions } from './csv.js';

export interface CsvEditorProps extends SerializeCsvOptions {
  value: readonly (readonly string[])[];
  onChange: (value: CsvData) => void;
  onImport?: (value: CsvData) => void;
  onExport?: (text: string) => void;
  onError?: (error: Error) => void;
  columnLabels?: readonly string[];
  readOnly?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function CsvEditor({
  value,
  onChange,
  onImport,
  onExport,
  onError,
  columnLabels = [],
  delimiter = ',',
  newline = '\r\n',
  bom = false,
  readOnly = false,
  className = '',
  'aria-label': label = 'CSV editor',
}: CsvEditorProps) {
  validateDelimiter(delimiter);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const width = value.reduce(
    (max, row) => Math.max(max, row.length),
    Math.max(1, columnLabels.length),
  );
  const report = (cause: unknown) => {
    const failure = cause instanceof Error ? cause : new Error(String(cause));
    setError(failure.message);
    onError?.(failure);
  };
  const importText = (text: string) => {
    let rows: CsvData;
    try {
      rows = parseCsv(text, { delimiter });
    } catch (cause) {
      report(cause);
      return;
    }
    setError('');
    onChange(rows);
    onImport?.(rows);
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch (cause) {
      report(cause);
      return;
    }
    importText(text);
  };
  const updateCell = (rowIndex: number, columnIndex: number, text: string) => {
    const next = value.map((row) => [...row]);
    while (next[rowIndex].length <= columnIndex) next[rowIndex].push('');
    next[rowIndex][columnIndex] = text;
    onChange(next);
  };
  const exportText = () => {
    let text: string;
    try {
      text = serializeCsv(value, { delimiter, newline, bom });
    } catch (cause) {
      report(cause);
      return;
    }
    setError('');
    setDraft(text);
    onExport?.(text);
  };

  return (
    <section className={`lp-csv ${className}`} aria-label={label}>
      <div className="lp-csv-scroll">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Row</th>
              {Array.from({ length: width }, (_, index) => (
                <th scope="col" key={index}>
                  {columnLabels[index] ?? `Column ${index + 1}`}
                </th>
              ))}
              {!readOnly && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {value.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th scope="row">{rowIndex + 1}</th>
                {Array.from({ length: width }, (_, columnIndex) => (
                  <td key={columnIndex}>
                    <input
                      aria-label={`Row ${rowIndex + 1}, ${columnLabels[columnIndex] ?? `column ${columnIndex + 1}`}`}
                      value={row[columnIndex] ?? ''}
                      readOnly={readOnly}
                      onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td>
                    <button
                      type="button"
                      aria-label={`Remove row ${rowIndex + 1}`}
                      onClick={() =>
                        onChange(
                          value.filter((_, index) => index !== rowIndex).map((cells) => [...cells]),
                        )
                      }
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="lp-csv-actions">
          <button
            type="button"
            onClick={() =>
              onChange([...value.map((row) => [...row]), Array<string>(width).fill('')])
            }
          >
            Add row
          </button>
          <button
            type="button"
            disabled={value.length === 0}
            onClick={() =>
              onChange(
                value.map((row) => [...Array.from({ length: width }, (_, i) => row[i] ?? ''), '']),
              )
            }
          >
            Add column
          </button>
          <label>
            Import file{' '}
            <input type="file" accept=".csv,text/csv,text/plain" onChange={importFile} />
          </label>
        </div>
      )}
      <label className="lp-csv-text">
        CSV text
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
      </label>
      <div className="lp-csv-actions">
        {!readOnly && (
          <button type="button" onClick={() => importText(draft)}>
            Import text
          </button>
        )}
        <button type="button" onClick={exportText}>
          Export to text
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
