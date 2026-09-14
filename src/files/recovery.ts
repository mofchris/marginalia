import type { EditorMode, EditorPosition, OpenFile } from '../types';

const KEY = 'marginalia.session.v1';
export function discardSession(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage may be unavailable */ }
}
export interface RecoverySession {
  version: 1;
  file: OpenFile;
  text: string;
  dirty: boolean;
  mode: EditorMode;
  position?: EditorPosition;
}

export function writeSession(session: RecoverySession): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
    return true;
  } catch {
    // Keep the previous recovery point if storage is full or unavailable.
    return false;
  }
}

export function readSession(): RecoverySession | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!value || value.version !== 1 || typeof value.text !== 'string' ||
        typeof value.dirty !== 'boolean' || !['wysiwyg', 'source', 'plain'].includes(value.mode)) return null;
    const file = value.file;
    if (!file || (file.path !== null && typeof file.path !== 'string') ||
        typeof file.name !== 'string' || typeof file.savedText !== 'string' ||
        typeof file.imported !== 'boolean' || !['markdown', 'plain'].includes(file.kind)) return null;
    const position = value.position;
    if (position && (!Number.isFinite(position.from) || !Number.isFinite(position.to) ||
        !Number.isFinite(position.scrollTop) || typeof position.before !== 'string' ||
        typeof position.after !== 'string')) delete value.position;
    return value as RecoverySession;
  } catch { return null; }
}

export function recoveryDecision(session: RecoverySession, disk: string | null): 'disk' | 'draft' | 'copy' {
  if (!session.file.path) return 'draft';
  if (disk === null) return 'copy';
  if (!session.dirty) return 'disk';
  return disk === session.file.savedText ? 'draft' : 'copy';
}

