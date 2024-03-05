import { Storage } from '@plasmohq/storage';

import { getMissingShortcuts } from '~/lib/utils';
import type { Message } from '~/types/message';

const storage = new Storage();

export const runtimeOnInstalledListener = () => {
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
};

export const actionOnClickedListener = () => {
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to query tabs:', chrome.runtime.lastError);
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
        try {
          url = removeParams(url);
        } catch (e) {
          console.error('Failed to remove params:', e);
        }
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
        if (!copyStyleId || copyStyleId === 'plain-url') {
          const message: Message = { type: 'copy', text: url };
          await chrome.tabs.sendMessage(tabId, message);
          return;
        }

        if (!activeTab.title) {
          const errorMessage: Message = {
            type: 'error',
            text: 'No title found',
          };
          await chrome.tabs.sendMessage(tabId, errorMessage);
          return;
        }
        const title = activeTab.title;
        url = formatUrl(title, url, copyStyleId);
        const message: Message = { type: 'copy', text: url };
        await chrome.tabs.sendMessage(tabId, message);
      } catch (e) {
        // Catch errors that occur on pages like chrome://extensions/
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
};

export const contextMenusOnClickedListener = () => {
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
        if (isRemoveParams !== undefined) {
          await storage.set('remove-params', !isRemoveParams);
        } else {
          console.error('Failed to get "remove-params" from storage');
        }
      } else if (info.menuItemId === 'url-decoding') {
        const isUrlDecoding = await storage.get<boolean>('url-decoding');
        if (isUrlDecoding !== undefined) {
          await storage.set('url-decoding', !isUrlDecoding);
        } else {
          console.error('Failed to get "url-decoding" from storage');
        }
      }
    } catch (e) {
      console.error('Failed to handle context menu click:', e);
    }
  });
};

export const initializeContextMenus = async () => {
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
    type: 'radio',
    id: 'plain-url',
    title: 'Plain URL',
    contexts: ['all'],
    checked: true,
  });

  chrome.contextMenus.create({
    parentId: 'copy-style',
    type: 'radio',
    id: 'title-url',
    title: 'Title URL',
    contexts: ['all'],
  });

  chrome.contextMenus.create({
    parentId: 'copy-style',
    type: 'radio',
    id: 'markdown-url',
    title: 'Markdown URL',
    contexts: ['all'],
  });

  chrome.contextMenus.create({
    parentId: 'copy-style',
    type: 'radio',
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

export const formatUrl = (title: string, url: string, copyStyleId: string) => {
  switch (copyStyleId) {
    case 'title-url': {
      return `${title} ${url}`;
    }
    case 'markdown-url': {
      return `[${title}](${url})`;
    }
    case 'backlog-url': {
      return `[${title}>${url}]`;
    }
    default: {
      return url;
    }
  }
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

runtimeOnInstalledListener();
actionOnClickedListener();
contextMenusOnClickedListener();
