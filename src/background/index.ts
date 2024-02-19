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

    await storage.set('copy-style-id', 'plain-url');
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
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    await updateContextMenusSelection();
  } catch (e) {
    console.error('Failed to update context menu selection:', e);
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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
      (async () => {
        await chrome.tabs.sendMessage(tabId, errorMessage);
      })();
      return;
    }
    const url = activeTab.url;

    (async () => {
      try {
        const message: Message = { type: 'copy', text: url };
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
    })();
  });
});

chrome.contextMenus.onClicked.addListener(async (info, _tab) => {
  if (
    info.menuItemId === 'plain-url' ||
    info.menuItemId === 'title-url' ||
    info.menuItemId === 'markdown-url' ||
    info.menuItemId === 'backlog-url'
  ) {
    try {
      await updateContextMenusSelection(info.menuItemId);
      await storage.set('copy-style-id', info.menuItemId);
    } catch (e) {
      console.error('Failed to update context menu selection:', e);
    }
  }
});

export const updateContextMenusSelection = async (selectedItemId?: string) => {
  const prevCopyStyleId = (await storage.get<string>('copy-style-id')) || 'plain-url';
  if (prevCopyStyleId !== selectedItemId && selectedItemId) {
    chrome.contextMenus.update(prevCopyStyleId, { checked: false });
  }
  if (selectedItemId) {
    chrome.contextMenus.update(selectedItemId, { checked: true });
  }
};

// TODO: Remove when building for production
storage.watch({
  'copy-style-id': (c) => {
    console.log(c.newValue);
  },
});
