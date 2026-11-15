/**
 * background.js - Manifest V3 Service Worker
 * Manages action clicks to toggle in-page drawer and handles chrome.downloads fallback.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[MoodleSmartDownloader] Extension installed.');
});

// Click on the toolbar action icon toggles the in-page drawer directly on Moodle!
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id || !tab.url) return;

  // Avoid injecting on chrome:// or restricted pages
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
    return;
  }

  try {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleDrawer' }, async (response) => {
      if (chrome.runtime.lastError || !response) {
        // Content scripts not yet present; inject dynamically
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['src/scraper.js', 'src/content.js']
          });
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'toggleDrawer' });
          }, 120);
        } catch (injectErr) {
          console.warn('[MoodleSmartDownloader] Could not inject content script:', injectErr);
          chrome.tabs.create({ url: chrome.runtime.getURL(`popup/popup.html?sourceTabId=${tab.id}`) });
        }
      }
    });
  } catch (err) {
    console.error('[MoodleSmartDownloader] Action click error:', err);
  }
});

// Chrome downloads handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
