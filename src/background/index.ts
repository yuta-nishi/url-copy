import { Storage } from '@plasmohq/storage';

import { getMissingShortcuts } from '~/lib/utils';
import type { Message } from '~/types/message';

const storage = new Storage();

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.commands.getAll((commands) => {
      const missingShortcuts = getMissingShortcuts(commands);
      if (missingShortcuts.length > 0) {
        chrome.runtime.openOptionsPage();
      }
    });
  }

  try {
    await initializeContextMenus();
  } catch (e) {
    console.error('Failed to initialize context menus:', e);
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to query tabs:', chrome.runtime.lastError.message);
      return;
    }

    if (!tabs[0]) {
      console.error('No active tab found');
      return;
    }
    const activeTab = tabs[0];

    if (!activeTab.id) {
      console.error('Active tab has no ID');
      return;
    }
    const tabId = activeTab.id;

    if (!activeTab.url) {
      const errorMessage: Message = {
        type: 'error',
        text: 'No URL found',
      };
      await chrome.tabs.sendMessage(tabId, errorMessage);
      return;
    }
    let url = activeTab.url;

    const isRemoveParams = await storage.get<boolean>('remove-params');
    if (isRemoveParams) {
      url = removeParams(url);
    }

    const isUrlDecoding = await storage.get<boolean>('url-decoding');
    if (isUrlDecoding) {
      try {
        url = decodeUrl(url);
      } catch (e) {
        console.error('Failed to decode URL:', e);
      }
    }

    try {
      const copyStyleId = await storage.get<string>('copy-style-id');
      let text: string;
      switch (copyStyleId) {
        case 'title-url': {
          const title = activeTab.title;
          text = `${title} ${url}`;
          break;
        }
        case 'markdown-url': {
          const title = activeTab.title;
          text = `[${title}](${url})`;
          break;
        }
        case 'backlog-url': {
          const title = activeTab.title;
          text = `[${title}>${url}]`;
          break;
        }
        default: {
          text = url;
          break;
        }
      }
      const message: Message = { type: 'copy', text };
      await chrome.tabs.sendMessage(tabId, message);
    } catch (e) {
      if (
        e instanceof Error &&
        e.message === 'Could not establish connection. Receiving end does not exist.'
      ) {
        console.error('url-copy extension cannot run on the current page.');
      } else if (e instanceof Error) {
        const errorMessage: Message = {
          type: 'error',
          text: e.message,
        };
        await chrome.tabs.sendMessage(tabId, errorMessage);
      }
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info, _tab) => {
  try {
    if (
      info.menuItemId === 'plain-url' ||
      info.menuItemId === 'title-url' ||
      info.menuItemId === 'markdown-url' ||
      info.menuItemId === 'backlog-url'
    ) {
      await updateContextMenusSelection(info.menuItemId);
      await storage.set('copy-style-id', info.menuItemId);
    } else if (info.menuItemId === 'remove-params') {
      const isRemoveParams = await storage.get<boolean>('remove-params');
      await storage.set('remove-params', !isRemoveParams);
    } else if (info.menuItemId === 'url-decoding') {
      const isUrlDecoding = await storage.get<boolean>('url-decoding');
      await storage.set('url-decoding', !isUrlDecoding);
    }
  } catch (e) {
    console.error('Failed to handle context menu click:', e);
  }
});

const initializeContextMenus = async () => {
  try {
    await storage.set('copy-style-id', 'plain-url');
    await storage.set('remove-params', true);
    await storage.set('url-decoding', true);
  } catch (e) {
    console.error('Failed to initialize storage:', e);
  }

  chrome.contextMenus.create({
    type: 'normal',
    id: 'copy-style',
    title: 'Copy Style',
    contexts: ['all'],
  });

  chrome.contextMenus.create({
    parentId: 'copy-style',
    type: 'checkbox',
    id: 'plain-url',
    title: 'Plain URL',
    contexts: ['all'],
    checked: true,
  });

  chrome.contextMenus.create({
    parentId: 'copy-style',
    type: 'checkbox',
    id: 'title-url',
    title: 'Title URL',
    contexts: ['all'],
  });

  chrome.contextMenus.create({
    parentId: 'copy-style',
    type: 'checkbox',
    id: 'markdown-url',
    title: 'Markdown URL',
    contexts: ['all'],
  });

  chrome.contextMenus.create({
    parentId: 'copy-style',
    type: 'checkbox',
    id: 'backlog-url',
    title: 'Backlog URL',
    contexts: ['all'],
  });

  chrome.contextMenus.create({
    type: 'checkbox',
    id: 'remove-params',
    title: 'Remove Params',
    contexts: ['all'],
    checked: true,
  });

  chrome.contextMenus.create({
    type: 'checkbox',
    id: 'url-decoding',
    title: 'URL Decoding',
    contexts: ['all'],
    checked: true,
  });
};

export const updateContextMenusSelection = async (selectedItemId: string) => {
  const prevCopyStyleId = (await storage.get<string>('copy-style-id')) || 'plain-url';
  if (prevCopyStyleId !== selectedItemId) {
    chrome.contextMenus.update(prevCopyStyleId, { checked: false });
  }
  chrome.contextMenus.update(selectedItemId, { checked: true });
};

export const removeParams = (url: string) => {
  const urlObj = new URL(url);
  if (urlObj.hostname.includes('amazon.co.jp')) {
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  }
  return url;
};

export const decodeUrl = (url: string) => {
  return decodeURIComponent(url);
};
