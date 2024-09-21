import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getMissingShortcuts = (commands: chrome.commands.Command[]) => {
  return commands.filter(({ shortcut }) => shortcut === '').map(({ name }) => name);
};
