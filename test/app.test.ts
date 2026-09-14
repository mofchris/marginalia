import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import { undo } from '@codemirror/commands';

const io = vi.hoisted(() => ({
  failRich: false,
  read: vi.fn(async () => 'Original'),
  write: vi.fn(async () => {}),
  pickSave: vi.fn(async (): Promise<string | null> => '/notes.txt'),
}));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ setTitle: vi.fn(async () => {}) }) }));
vi.mock('../src/files/io', async (original) => ({
  ...await original<object>(), readTextFile: io.read, writeTextFile: io.write, pickSavePath: io.pickSave,
}));
vi.mock('../src/ui/modal', () => ({ confirmDiscard: vi.fn(async () => 'discard') }));
vi.mock('../src/editor/markdown', async () => {
  const { createPlainEditor } = await import('../src/editor/plaintext');
  return { createMarkdownEditor: async (...args: Parameters<typeof createPlainEditor>) => {
    if (io.failRich) throw new Error('Editor unavailable');
    return createPlainEditor(...args);
  } };
});

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.spyOn(EditorView.prototype, 'requestMeasure').mockImplementation(() => {});
  localStorage.clear();
  document.body.innerHTML = readFileSync('index.html', 'utf8');
  io.read.mockReset().mockResolvedValue('Original');
  io.failRich = false;
  io.write.mockReset().mockResolvedValue(undefined);
  io.pickSave.mockReset().mockResolvedValue('/notes.txt');
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

function type(text: string) {
  const view = liveView();
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
}
function liveView() {
  return EditorView.findFromDOM(document.querySelector('.editor-surface:not([hidden]) .cm-editor') as HTMLElement)!;
}

test('typing during save remains unsaved after the older revision reaches disk', async () => {
  const app = await import('../src/app');
  await app.openPath('/notes.txt');
  await vi.advanceTimersByTimeAsync(120);
  type('First edit');
  let finish!: () => void;
  io.write.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const pending = app.save();
  await vi.advanceTimersByTimeAsync(0);
  type('First edit plus newer work');
  finish();
  await pending;
  expect(io.write).toHaveBeenCalledWith('/notes.txt', 'First edit');
  expect(app.isDirty()).toBe(true);
});

test('failed save preserves the text and offers recovery', async () => {
  const app = await import('../src/app');
  await app.openPath('/notes.txt');
  await vi.advanceTimersByTimeAsync(120);
  type('Keep this draft');
  io.write.mockRejectedValueOnce(new Error('Permission denied'));
  expect(await app.save()).toBe(false);
  expect(app.isDirty()).toBe(true);
  expect(liveView().state.doc.toString()).toBe('Keep this draft');
  expect(document.getElementById('notice-bar')!.hidden).toBe(false);
});

test('a cancelled Save As leaves an untitled draft dirty', async () => {
  const app = await import('../src/app');
  await app.newFile();
  await vi.advanceTimersByTimeAsync(120);
  type('Untitled work');
  io.pickSave.mockResolvedValueOnce(null);
  expect(await app.save()).toBe(false);
  expect(app.isDirty()).toBe(true);
});

test('the first keystroke immediately after opening is protected', async () => {
  const app = await import('../src/app');
  await app.openPath('/notes.txt');
  type('Typed immediately');
  expect(app.isDirty()).toBe(true);
});

test('undoing the only edit restores clean state and closes without a save prompt', async () => {
  const app = await import('../src/app');
  const { confirmDiscard } = await import('../src/ui/modal');
  await app.openPath('/notes.txt');
  type('Temporary edit');
  expect(app.isDirty()).toBe(true);
  undo(liveView());
  expect(app.isDirty()).toBe(false);
  vi.mocked(confirmDiscard).mockClear();
  expect(await app.guardDirty()).toBe(true);
  expect(confirmDiscard).not.toHaveBeenCalled();
});

test('a pending save cannot clear the dirty state of another document', async () => {
  const app = await import('../src/app');
  await app.openPath('/first.txt');
  await vi.advanceTimersByTimeAsync(120);
  type('First revision');
  let finish!: () => void;
  io.write.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const pending = app.save();
  await vi.advanceTimersByTimeAsync(0);
  await app.openPath('/second.txt');
  await vi.advanceTimersByTimeAsync(120);
  type('Second revision');
  finish();
  await pending;
  expect(app.currentFileName()).toBe('second.txt');
  expect(app.isDirty()).toBe(true);
});

test('saving refuses to overwrite a file edited elsewhere', async () => {
  const app = await import('../src/app');
  await app.openPath('/notes.txt');
  type('My work');
  io.read.mockResolvedValue('Someone else’s work');
  expect(await app.save()).toBe(false);
  expect(io.write).not.toHaveBeenCalled();
  expect(app.isDirty()).toBe(true);
});

test('switching views without editing reuses the rich editor and its selection', async () => {
  const app = await import('../src/app');
  await app.openPath('/notes.md');
  const rich = liveView();
  rich.dispatch({ selection: { anchor: 3, head: 6 } });
  await app.toggleSource();
  await app.toggleSource();
  expect(liveView()).toBe(rich);
  expect(rich.state.selection.main.from).toBe(3);
  expect(rich.state.selection.main.to).toBe(6);
});

test('source replacements remain undoable after a round trip through formatted view', async () => {
  const app = await import('../src/app');
  await app.openPath('/notes.md');
  await app.toggleSource();
  app.currentEditor()!.replaceRanges!([{ from: 0, to: 8 }], 'Replacement');
  await app.toggleSource(); await app.toggleSource();
  undo(liveView());
  expect(app.currentEditor()!.getText()).toBe('Original');
});

test('discarding a draft does not bring it back through recovery', async () => {
  const app = await import('../src/app');
  const recovery = await import('../src/files/recovery');
  await app.newFile(); type('Intentionally discarded'); app.checkpointSession();
  expect(recovery.readSession()?.dirty).toBe(true);
  expect(await app.guardDirty()).toBe(true);
  app.checkpointSession();
  expect(recovery.readSession()).toBe(null);
});

test('a failed editor load keeps the previous document and recovery identity', async () => {
  const app = await import('../src/app');
  const recovery = await import('../src/files/recovery');
  await app.openPath('/previous.txt'); type('Keep this work');
  io.failRich = true;
  await app.openPath('/broken.md');
  expect(app.currentFileName()).toBe('previous.txt');
  expect(app.currentEditor()!.getText()).toBe('Keep this work');
  expect(recovery.readSession()?.file.path).toBe('/previous.txt');
});
