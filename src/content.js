/**
 * content.js - Injected content script for Moodle pages
 * Listens for requests from popup and runs scraper in the page context.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scanDocuments') {
    try {
      if (typeof MoodleScraper === 'undefined') {
        sendResponse({ success: false, error: 'MoodleScraper not loaded' });
        return true;
      }

      const results = MoodleScraper.extractDocuments(document);
      sendResponse({ success: true, data: results });
    } catch (err) {
      console.error('[MoodleSmartDownloader] Error during extraction:', err);
      sendResponse({ success: false, error: err.message });
    }
    return true; // Async response
  }

  // Fetch file Blob using page session credentials
  if (request.action === 'fetchBlob') {
    fetch(request.url, {
      credentials: 'include',
      redirect: 'follow'
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }
        const blob = await response.blob();

        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({
            success: true,
            dataUrl: reader.result,
            mimeType: blob.type,
            size: blob.size
          });
        };
        reader.onerror = () => {
          sendResponse({ success: false, error: 'Failed to convert Blob to DataURL' });
        };
        reader.readAsDataURL(blob);
      })
      .catch((err) => {
        console.error('[MoodleSmartDownloader] Fetch failed:', err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Async response
  }
});
