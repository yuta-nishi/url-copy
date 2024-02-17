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

  const data = await storage.get('copy-style');
  const selectedStyle = data || 'plain-url';

  chrome.contextMenus.update('plain-url', { checked: selectedStyle === 'plain-url' });
  chrome.contextMenus.update('title-url', { checked: selectedStyle === 'title-url' });
  chrome.contextMenus.update('markdown-url', {
    checked: selectedStyle === 'markdown-url',
  });
  chrome.contextMenus.update('backlog-url', { checked: selectedStyle === 'backlog-url' });
});

// chrome.runtime.onStartup.addListener(async () => {});

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
  const data = await storage.get('copy-style');
  if (data === info.menuItemId || !data) {
    return;
  }
  chrome.contextMenus.update(data, { checked: false });
  chrome.contextMenus.update(info.menuItemId, { checked: true });
  await storage.set('copy-style', info.menuItemId);
});

// storage.watch({
//   'copy-style': (c) => {
//     console.log(c.newValue);
//   },
// });
