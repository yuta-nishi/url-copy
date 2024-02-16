import type { Message } from '~/types/message';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    checkCommandShortcuts();
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

const checkCommandShortcuts = () => {
  chrome.commands.getAll((commands) => {
    const missingShortcuts = commands
      .filter(({ shortcut }) => shortcut === '')
      .map(({ name }) => name);

    if (missingShortcuts.length > 0) {
      chrome.runtime.openOptionsPage();
    }
  });
};
