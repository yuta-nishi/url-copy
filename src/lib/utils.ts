import { Storage } from '@plasmohq/storage';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getMissingShortcuts = (commands: chrome.commands.Command[]) => {
  return commands.filter(({ shortcut }) => shortcut === '').map(({ name }) => name);
};

// The mock of chrome did not work well, so it is also implemented in utils for the time being
// TODO: Remove it
export const updateContextMenusSelection = async (selectedItemId?: string) => {
  const storage = new Storage();
  const copyStyleId = (await storage.get<string>('copy-style-id')) || 'plain-url';
  if (copyStyleId !== selectedItemId && selectedItemId) {
    chrome.contextMenus.update(selectedItemId, { checked: false });
  }
  chrome.contextMenus.update(copyStyleId, { checked: true });
};
