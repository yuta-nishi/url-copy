import { afterEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockChrome = {
  contextMenus: {
    update: vi.fn(),
    onClicked: { addListener: vi.fn() },
  },
  runtime: {
    onInstalled: {
      addListener: vi.fn(),
    },
    OnInstalledReason: { INSTALL: 'install' },
    onStartup: { addListener: vi.fn() },
  },
  action: {
    onClicked: { addListener: vi.fn() },
  },
};

vi.mock('@plasmohq/storage', () => ({
  Storage: vi.fn(() => ({ get: mockGet, watch: vi.fn() })),
}));
vi.stubGlobal('chrome', mockChrome);

describe('updateContextMenusSelection', async () => {
  const { updateContextMenusSelection } = await import('~/background');
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
