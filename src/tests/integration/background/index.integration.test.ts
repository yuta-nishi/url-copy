import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const setMock = vi.fn();
const chromeMock = {
  contextMenus: {
    create: vi.fn(),
    update: vi.fn(),
    onClicked: { addListener: vi.fn() },
  },
  runtime: {
    onInstalled: {
      addListener: vi.fn(),
    },
    OnInstalledReason: { INSTALL: 'install' },
    onStartup: { addListener: vi.fn() },
    openOptionsPage: vi.fn(),
    lastError: undefined,
  },
  action: {
    onClicked: { addListener: vi.fn() },
  },
  commands: {
    getAll: vi.fn(),
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

vi.mock('@plasmohq/storage', () => ({
  Storage: vi.fn(() => ({ get: getMock, set: setMock })),
}));
vi.stubGlobal('chrome', chromeMock);

describe('runtimeOnInstalledListener', async () => {
  const { runtimeOnInstalledListener } = await import('~/background');

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call chrome.commands.getAll when installed', () => {
    runtimeOnInstalledListener();

    chromeMock.runtime.onInstalled.addListener.mock.calls[0][0]({
      reason: chromeMock.runtime.OnInstalledReason.INSTALL,
    });

    expect(chromeMock.commands.getAll).toHaveBeenCalled();
  });

  it('should call chrome.runtime.openOptionsPage when there are missing shortcuts', async () => {
    const commands: chrome.commands.Command[] = [
      { name: 'command1', shortcut: 'Ctrl+C' },
      { name: 'command2', shortcut: '' },
      { name: 'command3', shortcut: 'Ctrl+X' },
    ];
    chromeMock.commands.getAll.mockImplementation((cb) => cb(commands));

    runtimeOnInstalledListener();

    chromeMock.runtime.onInstalled.addListener.mock.calls[0][0]({
      reason: chromeMock.runtime.OnInstalledReason.INSTALL,
    });

    expect(chromeMock.runtime.openOptionsPage).toHaveBeenCalled();

    // Confirm if await initializeContextMenus(); passes
    await vi.waitFor(() => {
      expect(setMock).toHaveBeenCalledWith('copy-style-id', 'plain-url');
      expect(setMock).toHaveBeenCalledWith('remove-params', true);
      expect(setMock).toHaveBeenCalledWith('url-decoding', true);
    });
  });
});

describe('actionOnClickedListener', async () => {
  const { actionOnClickedListener } = await import('~/background');

  beforeEach(() => {
    chromeMock.runtime.lastError = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call chrome.tabs.query with correct parameters', async () => {
    const callbackMock = vi.fn();
    const tabsMock = [{ id: 123, title: 'example', url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, _cb) => callbackMock(tabsMock));

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    expect(chromeMock.action.onClicked.addListener).toHaveBeenCalled();

    expect(chromeMock.tabs.query).toHaveBeenCalledWith(
      {
        active: true,
        currentWindow: true,
      },
      expect.any(Function),
    );
    expect(callbackMock).toHaveBeenCalledWith(tabsMock);
  });

  it('should call console.error when chrome.runtime.lastError is set', () => {
    const tabsMock = [{ id: 123, title: 'example', url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));

    const message = 'error';
    // @ts-expect-error need to override lastError type for this test case.
    chromeMock.runtime.lastError = { message };
    const consoleSpy = vi.spyOn(console, 'error');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to query tabs:', message);
  });

  it('should call console.error when no active tab is found', () => {
    const tabsMock = [undefined];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));

    const consoleSpy = vi.spyOn(console, 'error');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    expect(consoleSpy).toHaveBeenCalledWith('No active tab found');
  });

  it('should call console.error when active tab has no ID', () => {
    const tabsMock = [{ title: 'example', url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));

    const consoleSpy = vi.spyOn(console, 'error');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    expect(consoleSpy).toHaveBeenCalledWith('Active tab has no ID');
  });

  it('should call chrome.tabs.sendMessage with error message when no URL is found', async () => {
    const tabsMock = [{ id: 123, title: 'example' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'error',
        text: 'No URL found',
      });
    });
  });

  it('should call chrome.tabs.sendMessage with error message when no title is found', async () => {
    const tabsMock = [{ id: 123, url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'error',
        text: 'No title found',
      });
    });
  });
});
