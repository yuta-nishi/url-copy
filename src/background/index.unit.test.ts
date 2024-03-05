import { afterEach, describe, expect, it, vi } from 'vitest';

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
  },
  action: {
    onClicked: { addListener: vi.fn() },
  },
};

vi.mock('@plasmohq/storage', () => ({
  Storage: vi.fn(() => ({ get: getMock, set: setMock })),
}));
vi.stubGlobal('chrome', chromeMock);

describe('initializeContextMenus', async () => {
  const { initializeContextMenus } = await import('~/background');

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize storage with correct values', async () => {
    await initializeContextMenus();

    expect(setMock).toHaveBeenCalledTimes(3);
    expect(setMock).toHaveBeenNthCalledWith(1, 'copy-style-id', 'plain-url');
    expect(setMock).toHaveBeenNthCalledWith(2, 'remove-params', true);
    expect(setMock).toHaveBeenNthCalledWith(3, 'url-decoding', true);
  });

  it('should handle errors when initializing storage', async () => {
    const error = new Error('Failed to set value');
    setMock.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, 'error');

    await initializeContextMenus();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize storage:', error);
  });

  it('should call chrome.contextMenus.create with correct parameters', async () => {
    await initializeContextMenus();

    expect(chromeMock.contextMenus.create).toHaveBeenCalledTimes(7);
    expect(chromeMock.contextMenus.create).toHaveBeenNthCalledWith(1, {
      type: 'normal',
      id: 'copy-style',
      title: 'Copy Style',
      contexts: ['all'],
    });
    expect(chromeMock.contextMenus.create).toHaveBeenNthCalledWith(2, {
      parentId: 'copy-style',
      type: 'radio',
      id: 'plain-url',
      title: 'Plain URL',
      contexts: ['all'],
      checked: true,
    });
    expect(chromeMock.contextMenus.create).toHaveBeenNthCalledWith(3, {
      parentId: 'copy-style',
      type: 'radio',
      id: 'title-url',
      title: 'Title URL',
      contexts: ['all'],
    });
    expect(chromeMock.contextMenus.create).toHaveBeenNthCalledWith(4, {
      parentId: 'copy-style',
      type: 'radio',
      id: 'markdown-url',
      title: 'Markdown URL',
      contexts: ['all'],
    });
    expect(chromeMock.contextMenus.create).toHaveBeenNthCalledWith(5, {
      parentId: 'copy-style',
      type: 'radio',
      id: 'backlog-url',
      title: 'Backlog URL',
      contexts: ['all'],
    });
    expect(chromeMock.contextMenus.create).toHaveBeenNthCalledWith(6, {
      type: 'checkbox',
      id: 'remove-params',
      title: 'Remove Params',
      contexts: ['all'],
      checked: true,
    });
    expect(chromeMock.contextMenus.create).toHaveBeenNthCalledWith(7, {
      type: 'checkbox',
      id: 'url-decoding',
      title: 'URL Decoding',
      contexts: ['all'],
      checked: true,
    });
  });
});

describe('formatUrl', async () => {
  const { formatUrl } = await import('~/background');
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return the URL when copyStyleId is "plain-url"', () => {
    const title = 'Example Title';
    const url = 'https://www.example.com';
    const copyStyleId = 'plain-url';
    const result = formatUrl(title, url, copyStyleId);

    expect(result).toBe(url);
  });

  it('should concatenate the title and URL when copyStyleId is "title-url"', () => {
    const title = 'Example Title';
    const url = 'https://www.example.com';
    const copyStyleId = 'title-url';
    const result = formatUrl(title, url, copyStyleId);

    expect(result).toBe(`${title} ${url}`);
  });

  it('should format the URL as a Markdown link when copyStyleId is "markdown-url"', () => {
    const title = 'Example Title';
    const url = 'https://www.example.com';
    const copyStyleId = 'markdown-url';
    const result = formatUrl(title, url, copyStyleId);

    expect(result).toBe(`[${title}](${url})`);
  });

  it('should format the URL as a Backlog link when copyStyleId is "backlog-url"', () => {
    const title = 'Example Title';
    const url = 'https://www.example.com';
    const copyStyleId = 'backlog-url';
    const result = formatUrl(title, url, copyStyleId);

    expect(result).toBe(`[${title}>${url}]`);
  });

  it('should return the original URL when copyStyleId is not recognized', () => {
    const title = 'Example Title';
    const url = 'https://www.example.com';
    const copyStyleId = 'unknown-style';
    const result = formatUrl(title, url, copyStyleId);

    expect(result).toBe(url);
  });
});

describe('updateContextMenusSelection', async () => {
  const { updateContextMenusSelection } = await import('~/background');
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should only check the selected item when it matches the stored value', async () => {
    getMock.mockResolvedValue('plain-url');

    await updateContextMenusSelection('plain-url');
    expect(chromeMock.contextMenus.update).toHaveBeenCalledWith('plain-url', {
      checked: true,
    });
  });

  it('should check the newly selected item and uncheck the previously stored item when they differ', async () => {
    getMock.mockResolvedValue('plain-url');

    await updateContextMenusSelection('title-url');
    expect(chromeMock.contextMenus.update).toHaveBeenCalledWith('plain-url', {
      checked: false,
    });
    expect(chromeMock.contextMenus.update).toHaveBeenCalledWith('title-url', {
      checked: true,
    });
  });
});

describe('removeParams', async () => {
  const { removeParams } = await import('~/background');

  it('should remove query parameters from Amazon.co.jp URLs', () => {
    const url =
      'https://www.amazon.co.jp/dp/B08S6XH593/ref=sspa_dk_detail_4?psc=1&pd_rd_i=B08S6XH593';
    const expected = 'https://www.amazon.co.jp/dp/B08S6XH593/ref=sspa_dk_detail_4';
    expect(removeParams(url)).toBe(expected);
  });

  it('should remove query parameters from Amazon.co.jp URLs starting with product name', () => {
    const url = 'https://www.amazon.co.jp/product-name/dp/B08XYTWLZZ/?_encoding=UTF8';
    const expected = 'https://www.amazon.co.jp/product-name/dp/B08XYTWLZZ/';
    expect(removeParams(url)).toBe(expected);
  });

  it('should not modify non-Amazon.co.jp URLs', () => {
    const url = 'https://www.example.com/page?param=value';
    expect(removeParams(url)).toBe(url);
  });
});

describe('decodeUrl', async () => {
  const { decodeUrl } = await import('~/background');

  it('should decode URL', () => {
    const url = 'https://www.amazon.co.jp/%E3%83%AD%E3%82%B8%E3%82%AF%E3%83%BC%E3%83%AB';
    const expected = 'https://www.amazon.co.jp/ロジクール';
    expect(decodeUrl(url)).toBe(expected);
  });

  it('should not modify URL without encoded characters', () => {
    const url = 'https://www.example.com/page?param=value';
    expect(decodeUrl(url)).toBe(url);
  });
});
