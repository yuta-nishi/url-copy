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
    OnInstalledReason: { INSTALL: 'install' },
    onStartup: { addListener: vi.fn() },
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
      type: 'checkbox',
      id: 'plain-url',
      title: 'Plain URL',
      contexts: ['all'],
      checked: true,
    });
    expect(chromeMock.contextMenus.create).toHaveBeenNthCalledWith(3, {
      parentId: 'copy-style',
      type: 'checkbox',
      id: 'title-url',
      title: 'Title URL',
      contexts: ['all'],
    });
    expect(chromeMock.contextMenus.create).toHaveBeenNthCalledWith(4, {
      parentId: 'copy-style',
      type: 'checkbox',
      id: 'markdown-url',
      title: 'Markdown URL',
      contexts: ['all'],
    });
    expect(chromeMock.contextMenus.create).toHaveBeenNthCalledWith(5, {
      parentId: 'copy-style',
      type: 'checkbox',
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
      'https://www.amazon.co.jp/dp/B08S6XH593/ref=sspa_dk_detail_4?psc=1&pd_rd_i=B08S6XH593&pd_rd_w=DsjeC&content-id=amzn1.sym.f293be60-50b7-49bc-95e8-931faf86ed1e&pf_rd_p=f293be60-50b7-49bc-95e8-931faf86ed1e&pf_rd_r=DDG35R29P9GA6D4GTQ2P&pd_rd_wg=TQH9P&pd_rd_r=11fcade1-e21f-4852-b5d7-3f07641298e2&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWw';
    const expected = 'https://www.amazon.co.jp/dp/B08S6XH593/ref=sspa_dk_detail_4';
    expect(removeParams(url)).toBe(expected);
  });

  it('should remove query parameters from Amazon.co.jp URLs starting with product name', () => {
    const url =
      'https://www.amazon.co.jp/product-name/dp/B08XYTWLZZ/?_encoding=UTF8&pd_rd_w=VFG7B&content-id=amzn1.sym.50c73aa3-2a5b-4577-ba20-a23e7db225e1&pf_rd_p=50c73aa3-2a5b-4577-ba20-a23e7db225e1&pf_rd_r=34BE9XCKR1ZCEB0GNKYG&pd_rd_wg=91sf4&pd_rd_r=c01a09fd-ab52-4098-a512-53ee2fbe1e02&ref_=pd_gw_dccs_xc_dlv1s';
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
    const url =
      'https://www.amazon.co.jp/%E3%83%AD%E3%82%B8%E3%82%AF%E3%83%BC%E3%83%AB-M575S-Bluetooth-%E3%83%88%E3%83%A9%E3%83%83%E3%82%AF%E3%83%9C%E3%83%BC%E3%83%AB%E3%83%9E%E3%82%A6%E3%82%B9-%E9%9B%BB%E6%B1%A0%E5%AF%BF%E5%91%BD%E6%9C%80%E5%A4%A724%E3%82%B1%E6%9C%88';
    const expected =
      'https://www.amazon.co.jp/ロジクール-M575S-Bluetooth-トラックボールマウス-電池寿命最大24ケ月';
    expect(decodeUrl(url)).toBe(expected);
  });

  it('should not modify URL without encoded characters', () => {
    const url = 'https://www.example.com/page?param=value';
    expect(decodeUrl(url)).toBe(url);
  });
});
