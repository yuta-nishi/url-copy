import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMissingShortcuts, updateContextMenusSelection } from '~/lib/utils';

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

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
const mockChrome = {
  contextMenus: { update: vi.fn() },
};

vi.mock('@plasmohq/storage', () => ({
  Storage: vi.fn(() => ({ get: mockGet })),
}));
vi.stubGlobal('chrome', mockChrome);

describe('updateContextMenusSelection', async () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should only check the selected item when it matches the stored value', async () => {
    mockGet.mockResolvedValue('plain-url');

    await updateContextMenusSelection('plain-url');
    expect(mockChrome.contextMenus.update).not.toHaveBeenCalledWith('title-url', {
      checked: false,
    });
    expect(mockChrome.contextMenus.update).toHaveBeenCalledWith('plain-url', {
      checked: true,
    });
  });

  it('should check the newly selected item and uncheck the previously stored item when they differ', async () => {
    mockGet.mockResolvedValue('plain-url');

    await updateContextMenusSelection('title-url');
    expect(mockChrome.contextMenus.update).toHaveBeenCalledWith('title-url', {
      checked: false,
    });
    expect(mockChrome.contextMenus.update).toHaveBeenCalledWith('plain-url', {
      checked: true,
    });
  });
});
