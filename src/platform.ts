import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const native = isTauri();
export function setWindowTitle(title: string): void {
  document.title = title;
  if (native) void getCurrentWindow().setTitle(title).catch(() => {});
}
