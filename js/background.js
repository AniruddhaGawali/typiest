chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({
    text: 'OFF',
  });
  chrome.action.setBadgeBackgroundColor({
    color: '#FF0000',
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  const prevState = await chrome.action.getBadgeText({ tabId: tab.id });

  const nextState = prevState === 'ON' ? 'OFF' : 'ON';
  await chrome.action.setBadgeText({
    tabId: tab.id,
    text: nextState,
  });

  await chrome.action.setBadgeBackgroundColor({
    tabId: tab.id,
    color: nextState === 'ON' ? '#22c55e' : '#FF0000',
  });

  chrome.tabs.sendMessage(tab.id, {
    type: 'TOGGLE_TYPIST',
    enabled: nextState === 'ON',
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_BADGE') {
    const { text, color } = request.payload;
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
  }
});
