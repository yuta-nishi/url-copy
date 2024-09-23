import { describe, expect, it } from 'vitest';

import { getMissingShortcuts } from '~/lib/utils';

describe('getMissingShortcuts', () => {
  it('should return an empty array when all commands have shortcuts', () => {
    const commands: chrome.commands.Command[] = [
      { name: 'command1', shortcut: 'Ctrl+C' },
      { name: 'command2', shortcut: 'Ctrl+V' },
      { name: 'command3', shortcut: 'Ctrl+X' },
    ];
    const result = getMissingShortcuts(commands);
    expect(result).toEqual([]);
  });

  it('should return an array of missing shortcuts', () => {
    const commands: chrome.commands.Command[] = [
      { name: 'command1', shortcut: 'Ctrl+C' },
      { name: 'command2', shortcut: '' },
      { name: 'command3', shortcut: 'Ctrl+X' },
    ];
    const result = getMissingShortcuts(commands);
    expect(result).toEqual(['command2']);
  });

  it('should return an empty array when there are no commands', () => {
    const commands: chrome.commands.Command[] = [];
    const result = getMissingShortcuts(commands);
    expect(result).toEqual([]);
  });
});
