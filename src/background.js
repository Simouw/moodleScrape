/**
 * background.js - Service Worker Manifest V3
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[MoodleSmartDownloader] Extension installée avec succès.');
});

// Écoute des requêtes globales si nécessaire
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
