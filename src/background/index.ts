import type { Message } from '~/types/message';

/**
 * Extension install process
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    checkCommandShortcuts();
  }
});

/**
 * Icon click process
 */
chrome.action.onClicked.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    const url = activeTab?.url || '';
    const id = activeTab?.id || 0;
    const message: Message = { type: 'copy', text: url! };
    (async () => {
      chrome.tabs.sendMessage(id, message);
    })();
  });
});

/**
 * Check if any command shortcuts are conflicting
 */
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
