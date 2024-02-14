chrome.action.onClicked.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab) {
      return;
    }
    const url = activeTab.url;
    (async () => {
      if (!activeTab.id) {
        return;
      }
      chrome.tabs.sendMessage(activeTab.id, { type: 'copy', text: url });
    })();
  });
});
