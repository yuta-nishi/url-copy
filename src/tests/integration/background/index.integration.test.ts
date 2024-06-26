import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getCopyStyleIdMock = vi.fn();
const getRemoveParamsMock = vi.fn();
const getUrlDecodingMock = vi.fn();
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
  Storage: vi.fn(() => ({
    get: vi.fn((key) => {
      switch (key) {
        case 'copy-style-id':
          return getCopyStyleIdMock();
        case 'remove-params':
          return getRemoveParamsMock();
        case 'url-decoding':
          return getUrlDecodingMock();
      }
    }),
    set: setMock,
  })),
}));
vi.stubGlobal('chrome', chromeMock);

describe('runtimeOnInstalledListener', async () => {
  const { runtimeOnInstalledListener } = await import('~/background');

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call chrome.commands.getAll when installed', () => {
    const details = { reason: chromeMock.runtime.OnInstalledReason.INSTALL };

    runtimeOnInstalledListener();
    chromeMock.runtime.onInstalled.addListener.mock.calls[0][0](details);

    expect(chromeMock.commands.getAll).toHaveBeenCalled();
  });

  it('should call chrome.runtime.openOptionsPage when there are missing shortcuts', async () => {
    const commands: chrome.commands.Command[] = [
      { name: 'command1', shortcut: 'Ctrl+C' },
      { name: 'command2', shortcut: '' },
      { name: 'command3', shortcut: 'Ctrl+X' },
    ];
    chromeMock.commands.getAll.mockImplementation((cb) => cb(commands));
    const details = { reason: chromeMock.runtime.OnInstalledReason.INSTALL };

    runtimeOnInstalledListener();
    chromeMock.runtime.onInstalled.addListener.mock.calls[0][0](details);

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

    const error = new Error('error');
    // @ts-expect-error need to override lastError type for this test case.
    chromeMock.runtime.lastError = error;
    const consoleSpy = vi.spyOn(console, 'error');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to query tabs:', error);
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

  it('should call chrome.tabs.sendMessage with url when copyStyleId is undefined', async () => {
    const tabsMock = [{ id: 123, title: 'example', url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));
    getRemoveParamsMock.mockResolvedValue(false);
    getUrlDecodingMock.mockResolvedValue(false);
    getCopyStyleIdMock.mockResolvedValue(undefined);

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'copy',
        text: 'https://www.example.com',
      });
    });
  });

  it('should call chrome.tabs.sendMessage with url when copyStyleId is plain-url', async () => {
    const tabsMock = [{ id: 123, title: 'example', url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));
    getRemoveParamsMock.mockResolvedValue(false);
    getUrlDecodingMock.mockResolvedValue(false);
    getCopyStyleIdMock.mockResolvedValue('plain-url');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'copy',
        text: 'https://www.example.com',
      });
    });
  });

  it('should call chrome.tabs.sendMessage with error message when no title is found', async () => {
    const tabsMock = [{ id: 123, url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));
    getRemoveParamsMock.mockResolvedValue(false);
    getUrlDecodingMock.mockResolvedValue(false);
    getCopyStyleIdMock.mockResolvedValue('title-url');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'error',
        text: 'No title found',
      });
    });
  });

  it('should call chrome.tabs.sendMessage with url when copyStyleId is title-url', async () => {
    const tabsMock = [{ id: 123, title: 'example', url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));
    getRemoveParamsMock.mockResolvedValue(false);
    getUrlDecodingMock.mockResolvedValue(false);
    getCopyStyleIdMock.mockResolvedValue('title-url');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'copy',
        text: 'example https://www.example.com',
      });
    });
  });

  it('should call chrome.tabs.sendMessage with url when copyStyleId is markdown', async () => {
    const tabsMock = [{ id: 123, title: 'example', url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));
    getRemoveParamsMock.mockResolvedValue(false);
    getUrlDecodingMock.mockResolvedValue(false);
    getCopyStyleIdMock.mockResolvedValue('markdown-url');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'copy',
        text: '[example](https://www.example.com)',
      });
    });
  });

  it('should call chrome.tabs.sendMessage with url when copyStyleId is backlog', async () => {
    const tabsMock = [{ id: 123, title: 'example', url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));
    getRemoveParamsMock.mockResolvedValue(false);
    getUrlDecodingMock.mockResolvedValue(false);
    getCopyStyleIdMock.mockResolvedValue('backlog-url');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'copy',
        text: '[example>https://www.example.com]',
      });
    });
  });

  it('should call chrome.tabs.sendMessage with url when copyStyleId is plain-url and removeParams is true', async () => {
    const tabsMock = [
      {
        id: 123,
        url: 'https://www.amazon.co.jp/dp/B08S6XH593/ref=sspa_dk_detail_4?psc=1&pd_rd_i=B08S6XH593',
      },
    ];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));
    getRemoveParamsMock.mockResolvedValue(true);
    getUrlDecodingMock.mockResolvedValue(false);
    getCopyStyleIdMock.mockResolvedValue('plain-url');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'copy',
        text: 'https://www.amazon.co.jp/dp/B08S6XH593/ref=sspa_dk_detail_4',
      });
    });
  });

  it('should call chrome.tabs.sendMessage with url when copyStyleId is plain-url and urlDecoding is true', async () => {
    const tabsMock = [
      {
        id: 123,
        url: 'https://www.amazon.co.jp/%E3%83%AD%E3%82%B8%E3%82%AF%E3%83%BC%E3%83%AB',
      },
    ];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));
    getRemoveParamsMock.mockResolvedValue(false);
    getUrlDecodingMock.mockResolvedValue(true);
    getCopyStyleIdMock.mockResolvedValue('plain-url');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'copy',
        text: 'https://www.amazon.co.jp/ロジクール',
      });
    });
  });

  it('should call chrome.tabs.sendMessage with url when copyStyleId is plain-url, removeParams is true, and urlDecoding is true', async () => {
    const tabsMock = [
      {
        id: 123,
        url: 'https://www.amazon.co.jp/%E3%83%AD%E3%82%B8%E3%82%AF%E3%83%BC%E3%83%AB?param=value',
      },
    ];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));
    getRemoveParamsMock.mockResolvedValue(true);
    getUrlDecodingMock.mockResolvedValue(true);
    getCopyStyleIdMock.mockResolvedValue('plain-url');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'copy',
        text: 'https://www.amazon.co.jp/ロジクール',
      });
    });
  });

  it('should call console.error when could not establish connection', async () => {
    const tabsMock = [{ id: 123, url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));
    getRemoveParamsMock.mockResolvedValue(false);
    getUrlDecodingMock.mockResolvedValue(false);
    getCopyStyleIdMock.mockResolvedValue('plain-url');
    chromeMock.tabs.sendMessage.mockRejectedValue(
      new Error('Could not establish connection. Receiving end does not exist.'),
    );
    const consoleSpy = vi.spyOn(console, 'error');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'url-copy extension cannot run on the current page.',
      );
    });
  });

  it('should call console.error when an error occurs', async () => {
    const tabsMock = [{ id: 123, url: 'https://www.example.com' }];
    chromeMock.tabs.query.mockImplementation((_, cb) => cb(tabsMock));
    getRemoveParamsMock.mockResolvedValue(false);
    getUrlDecodingMock.mockResolvedValue(false);
    getCopyStyleIdMock.mockResolvedValue('plain-url');
    const error = new Error('error');
    chromeMock.tabs.sendMessage.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, 'error');

    actionOnClickedListener();
    chromeMock.action.onClicked.addListener.mock.calls[0][0]();

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to send message:', error);
    });
  });
});

describe('contextMenusOnClickedListener', async () => {
  const { contextMenusOnClickedListener } = await import('~/background');

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update context menus selection and set copy-style-id when menu item is plain-url', async () => {
    const info = { menuItemId: 'plain-url' };

    contextMenusOnClickedListener();
    chromeMock.contextMenus.onClicked.addListener.mock.calls[0][0](info, null);

    await vi.waitFor(() => {
      expect(chromeMock.contextMenus.update).toHaveBeenCalledWith('plain-url', {
        checked: true,
      });
      expect(setMock).toHaveBeenCalledWith('copy-style-id', 'plain-url');
    });
  });

  it('should update context menus selection and set copy-style-id when menu item is title-url', async () => {
    const info = { menuItemId: 'title-url' };

    contextMenusOnClickedListener();
    chromeMock.contextMenus.onClicked.addListener.mock.calls[0][0](info, null);

    await vi.waitFor(() => {
      expect(chromeMock.contextMenus.update).toHaveBeenCalledWith('title-url', {
        checked: true,
      });
      expect(setMock).toHaveBeenCalledWith('copy-style-id', 'title-url');
    });
  });

  it('should update context menus selection and set copy-style-id when menu item is markdown-url', async () => {
    const info = { menuItemId: 'markdown-url' };

    contextMenusOnClickedListener();
    chromeMock.contextMenus.onClicked.addListener.mock.calls[0][0](info, null);

    await vi.waitFor(() => {
      expect(chromeMock.contextMenus.update).toHaveBeenCalledWith('markdown-url', {
        checked: true,
      });
      expect(setMock).toHaveBeenCalledWith('copy-style-id', 'markdown-url');
    });
  });

  it('should update context menus selection and set copy-style-id when menu item is backlog-url', async () => {
    const info = { menuItemId: 'backlog-url' };

    contextMenusOnClickedListener();
    chromeMock.contextMenus.onClicked.addListener.mock.calls[0][0](info, null);

    await vi.waitFor(() => {
      expect(chromeMock.contextMenus.update).toHaveBeenCalledWith('backlog-url', {
        checked: true,
      });
      expect(setMock).toHaveBeenCalledWith('copy-style-id', 'backlog-url');
    });
  });

  it('should update remove-params when menu item is remove-params', async () => {
    const info = { menuItemId: 'remove-params' };
    getRemoveParamsMock.mockResolvedValue(false);

    contextMenusOnClickedListener();
    chromeMock.contextMenus.onClicked.addListener.mock.calls[0][0](info, null);

    await vi.waitFor(() => {
      expect(setMock).toHaveBeenCalledWith('remove-params', true);
    });
  });

  it('should call console.error when remove-params is undefined', async () => {
    const info = { menuItemId: 'remove-params' };
    getRemoveParamsMock.mockResolvedValue(undefined);
    const consoleSpy = vi.spyOn(console, 'error');

    contextMenusOnClickedListener();
    chromeMock.contextMenus.onClicked.addListener.mock.calls[0][0](info, null);

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get "remove-params" from storage',
      );
    });
  });

  it('should update url-decoding when menu item is url-decoding', async () => {
    const info = { menuItemId: 'url-decoding' };
    getUrlDecodingMock.mockResolvedValue(false);

    contextMenusOnClickedListener();
    chromeMock.contextMenus.onClicked.addListener.mock.calls[0][0](info, null);

    await vi.waitFor(() => {
      expect(setMock).toHaveBeenCalledWith('url-decoding', true);
    });
  });

  it('should call console.error when url-decoding is undefined', async () => {
    const info = { menuItemId: 'url-decoding' };
    getUrlDecodingMock.mockResolvedValue(undefined);
    const consoleSpy = vi.spyOn(console, 'error');

    contextMenusOnClickedListener();
    chromeMock.contextMenus.onClicked.addListener.mock.calls[0][0](info, null);

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get "url-decoding" from storage',
      );
    });
  });

  it('should call console.error when menu item is unknown', () => {
    const info = { menuItemId: 'unknown' };
    const consoleSpy = vi.spyOn(console, 'error');

    contextMenusOnClickedListener();
    chromeMock.contextMenus.onClicked.addListener.mock.calls[0][0](info, null);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Unknown context menu item:',
      info.menuItemId,
    );
  });

  it('should call console.error when an error occurs', async () => {
    const info = { menuItemId: 'plain-url' };
    const error = new Error('error');
    getCopyStyleIdMock.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, 'error');

    contextMenusOnClickedListener();
    chromeMock.contextMenus.onClicked.addListener.mock.calls[0][0](info, null);

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to handle context menu click:',
        error,
      );
    });
  });
});
