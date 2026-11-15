/**
 * background.js - Manifest V3 Service Worker
 * Manages action clicks to toggle in-page drawer, opens dedicated tab, and handles chrome.downloads.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[MoodleSmartDownloader] Extension installed.');
});

// Action click toggles the in-page drawer directly on Moodle
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id || !tab.url) return;

  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html?tab=1') });
    return;
  }

  try {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleDrawer' }, async (response) => {
      if (chrome.runtime.lastError || !response) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['src/scraper.js', 'src/content.js']
          });
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'toggleDrawer' });
          }, 120);
        } catch (injectErr) {
          chrome.tabs.create({ url: chrome.runtime.getURL(`popup/popup.html?tab=1&sourceTabId=${tab.id}`) });
        }
      }
    });
  } catch (err) {
    console.error('[MoodleSmartDownloader] Action click error:', err);
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openDedicatedTab') {
    const sourceTabId = sender.tab ? sender.tab.id : null;
    chrome.tabs.create({
      url: chrome.runtime.getURL(`popup/popup.html?tab=1&sourceTabId=${sourceTabId || ''}`)
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'downloadViaChrome') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: false,
      conflictAction: 'uniquify'
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true;
  }
});
