import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

test('controlled cell edits, row/column actions, text/file import, export, and errors', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost' });
  for (const key of [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLTextAreaElement',
    'Event',
  ]) {
    Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createElement: h, useState, act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { CsvEditor } = await import('../dist/esm/index.js');
  const container = document.getElementById('root');
  const root = createRoot(container);
  let latest;
  let exported;
  let imported;
  const errors = [];
  function App() {
    const [value, setValue] = useState([['first', 'second']]);
    latest = value;
    return h(CsvEditor, {
      value,
      onChange: setValue,
      onImport: (rows) => {
        imported = rows;
      },
      onExport: (text) => {
        exported = text;
      },
      onError: (error) => errors.push(error),
    });
  }
  const button = (text) =>
    [...container.querySelectorAll('button')].find((item) => item.textContent === text);
  const input = async (element, text) => {
    const prototype =
      element.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, text);
      element.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };
  try {
    await act(async () => root.render(h(App)));
    await input(container.querySelector('input[aria-label="Row 1, column 1"]'), 'changed');
    assert.deepEqual(latest, [['changed', 'second']]);
    await act(async () => button('Add row').click());
    await act(async () => button('Add column').click());
    assert.deepEqual(latest, [
      ['changed', 'second', ''],
      ['', '', ''],
    ]);
    await act(async () => container.querySelector('[aria-label="Remove row 2"]').click());
    assert.equal(latest.length, 1);
    await input(container.querySelector('textarea'), 'a,"two\nlines"\n');
    await act(async () => button('Import text').click());
    assert.deepEqual(latest, [['a', 'two\nlines']]);
    assert.deepEqual(imported, latest);
    await act(async () => button('Export to text').click());
    assert.equal(exported, 'a,"two\nlines"');
    assert.equal(container.querySelector('textarea').value, exported);
    await input(container.querySelector('textarea'), '"unterminated');
    await act(async () => button('Import text').click());
    assert.match(container.querySelector('[role="alert"]').textContent, /Unterminated/);
    assert.deepEqual(latest, [['a', 'two\nlines']]);
    assert.equal(errors.length, 1);
    const file = container.querySelector('input[type="file"]');
    Object.defineProperty(file, 'files', {
      configurable: true,
      value: [{ text: async () => '\uFEFFfile,row' }],
    });
    await act(async () => file.dispatchEvent(new window.Event('change', { bubbles: true })));
    assert.deepEqual(latest, [['file', 'row']]);
    assert.equal(container.querySelector('[role="alert"]'), null);
    Object.defineProperty(file, 'files', {
      configurable: true,
      value: [
        {
          text: async () => {
            throw new Error('Read failed');
          },
        },
      ],
    });
    await act(async () => file.dispatchEvent(new window.Event('change', { bubbles: true })));
    assert.match(container.querySelector('[role="alert"]').textContent, /Read failed/);
    await act(async () =>
      root.render(
        h(CsvEditor, {
          value: latest,
          onChange: () => assert.fail('read-only changed'),
          readOnly: true,
        }),
      ),
    );
    assert.equal(button('Import text'), undefined);
    assert.equal(button('Add row'), undefined);
    assert.equal(container.querySelector('input[aria-label]').readOnly, true);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
