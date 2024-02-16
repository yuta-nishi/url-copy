import { describe, expect, it } from 'vitest';

import { getMissingShortcuts } from '~/lib/utils';

describe('getMissingShortcuts', () => {
  it('should return an empty array when all commands have shortcuts', () => {
    const commands: chrome.commands.Command[] = [
      { name: 'Command1', shortcut: 'Ctrl+C' },
      { name: 'Command2', shortcut: 'Ctrl+V' },
      { name: 'Command3', shortcut: 'Ctrl+X' },
    ];
    const result = getMissingShortcuts(commands);
    expect(result).toEqual([]);
  });

  it('should return an array of missing shortcuts', () => {
    const commands: chrome.commands.Command[] = [
      { name: 'Command1', shortcut: 'Ctrl+C' },
      { name: 'Command2', shortcut: '' },
      { name: 'Command3', shortcut: 'Ctrl+X' },
    ];
    const result = getMissingShortcuts(commands);
    expect(result).toEqual(['Command2']);
  });

  it('should return an empty array when there are no commands', () => {
    const commands: chrome.commands.Command[] = [];
    const result = getMissingShortcuts(commands);
    expect(result).toEqual([]);
  });
});
