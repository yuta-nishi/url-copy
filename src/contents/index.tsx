import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
};

navigator.permissions.query({ name: 'clipboard-write' as PermissionName }).then((res) => {
  if (res.state === 'granted' || res.state === 'prompt') {
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message.type === 'copy') {
        navigator.clipboard.writeText(message.text).then(
          () => {
            console.log('copied');
          },
          () => {
            console.error('failed to copy');
          },
        );
      }
    });
  }
});
