# @lp-labs/react-csv-editor

Package version: `0.1.0`.

An original, standalone CSV parser/serializer and controlled React editor.
No runtime dependencies; React is a peer. ESM and CommonJS include matching
TypeScript declarations. CSS is optional and is never imported automatically.

## Install

```sh
npm install @lp-labs/react-csv-editor react
```

Use React `^18.2.0 || ^19.0.0` and a compatible renderer in your application.

```tsx
import { useState } from "react";
import { CsvEditor, parseCsv, serializeCsv } from "@lp-labs/react-csv-editor";
import type { CsvData } from "@lp-labs/react-csv-editor";
import "@lp-labs/react-csv-editor/styles.css";

export function Contacts() {
  const [rows, setRows] = useState<CsvData>([
    ["Ada", "ada@example.com"],
    ["Lin", "lin@example.com"],
  ]);
  const [exported, setExported] = useState("");

  return (
    <>
      <CsvEditor
        value={rows}
        onChange={setRows}
        columnLabels={["Name", "Email"]}
        onImport={(next) => console.log(`Imported ${next.length} rows`)}
        onExport={setExported}
        onError={(error) => console.error(error.message)}
      />
      <pre>{exported}</pre>
    </>
  );
}

const rows = parseCsv('\uFEFFname;note\r\nAda;"line 1\nline 2"', { delimiter: ";" });
const text = serializeCsv(rows, { delimiter: ";", newline: "\n", bom: true });
```

Column labels are presentation only: no row is consumed as a header. To use
the first parsed row as labels, split it explicitly in application code.
Always persist `onChange` proposals into `value`.

## Pure API and types

- `CsvData = string[][]`.
- `CsvOptions = { delimiter?: string }`.
- `SerializeCsvOptions extends CsvOptions` adds `newline?: "\n" | "\r\n"`
  and `bom?: boolean`.
- `parseCsv(text: string, options?: CsvOptions): CsvData`.
- `serializeCsv(rows: readonly (readonly string[])[], options?: SerializeCsvOptions): string`.
- `validateDelimiter(delimiter: string): void`.

Delimiter defaults to comma. A delimiter must be exactly one BMP character
other than a quote, CR, LF, BOM, or surrogate; tab and semicolon are valid.
Invalid delimiters throw `TypeError`.

Parsing strips one leading Unicode BOM, accepts CRLF, LF, and CR record
endings, preserves quoted newlines verbatim, handles doubled quotes, empty
fields, trailing delimiters, and ragged rows. Spaces are significant.
Quotes must start a field; after a closing quote only a delimiter, record
ending, or end of input is allowed. Malformed/unclosed quoting throws
`SyntaxError`; the offset in a quoting error is relative to the BOM-stripped
JavaScript string. It is not a byte offset.

Empty input (or BOM alone) gives `[]`. A final record terminator does not
create an extra row: `"a\n"` gives `[["a"]]`; `"\n"` gives `[[""]]`.
The parser does not infer headers, numbers, dates, comments, or delimiters.

Serialization defaults to CRLF and no BOM. It quotes empty fields and fields
containing delimiters, quotes, line endings, or a BOM; embedded quotes are
doubled. It emits no final record terminator. `[]` becomes `""`. Zero-field
rows cannot be represented and throw `TypeError`; so do non-string cells or
an unsupported newline. Neither helper mutates input.

## CsvEditorProps

`CsvEditor(props: CsvEditorProps)` accepts all serializer options above.

| Prop | Default | Contract |
| --- | --- | --- |
| `value` | required | Readonly array of readonly string rows |
| `onChange(rows: CsvData)` | required | New rows after edit, add, remove, or successful import |
| `onImport(rows: CsvData)` | absent | Called after `onChange` on successful text/file import |
| `onExport(text: string)` | absent | Called after successful serialization |
| `onError(error: Error)` | absent | Parse, serialize, or file-reading failures |
| `columnLabels` | `[]` | Readonly display labels; missing labels use `Column N` |
| `delimiter` | `","` | Parsing and serialization delimiter |
| `newline` | `"\r\n"` | Export record separator |
| `bom` | `false` | Prefix exported text with a BOM |
| `readOnly` | `false` | Read-only cells; hides row/column and import actions |
| `className` | `""` | Additional root class |
| `aria-label` | `"CSV editor"` | Section label and table caption |

The table width is the maximum of one, label count, and row lengths. Missing
cells display empty text; editing one extends that row without changing
other rows. Add row uses the current table width. Add column pads each row
to that width and appends a cell. It is disabled for an empty dataset.
Remove affects one row. All changes copy arrays rather than mutate props.

Import text replaces the dataset. Import file reads one selected file via
the browser's `File.text()` API; MIME/extension selection is a hint, not
content validation. Export to text writes into the textarea and calls
`onExport`; **it does not download a file, upload data, or write a clipboard**.
The textarea is a staging area, not live parsing, and remains editable even
in read-only mode so exported text can be selected/replaced.

Operation failures leave `value` unchanged and display an alert; successful
import/export clears the alert. Invalid delimiter props throw during render.
Consumer callback exceptions propagate; they are not classified as CSV
errors. If simultaneous file reads are initiated, their completion order
determines callback order; there is no cancellation/version arbitration.

## Customization and accessibility

Override `.lp-csv` and its `.lp-csv-scroll`, `.lp-csv-actions`,
`.lp-csv-text` descendants. Theme variables are `--lp-csv-border` and
`--lp-csv-accent`, for example:

```css
.my-editor { --lp-csv-accent: #6d28d9; --lp-csv-border: #8b8b99; }
```

Pass `className="my-editor"`. The component uses a native table, scoped
headers, labeled text inputs, native buttons, and an error alert. Standard
Tab/input keyboard behavior applies; it is not an ARIA spreadsheet with
arrow navigation or multi-cell selection. Supply meaningful labels and
check contrast after overriding styles.

## Bounds

This is in-memory text editing, not a streaming CSV engine. There is no
virtualization, undo history, cell type inference, encoding detection,
multi-character separator, or spreadsheet formula evaluation. File decoding
uses the browser's UTF-8 `File.text()` behavior.

**CSV quoting is not spreadsheet formula-injection protection.** Values
starting with `=`, `+`, `-`, or `@` are preserved unchanged. If a spreadsheet
will consume untrusted values, apply your own destination-specific policy
before export. This package makes no sanitization or production-certification
claim. Test with your intended CSV consumer and accessibility environment.

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
