/**
 * content.js - Script de contenu injecté dans la page Moodle
 * Écoute les requêtes du popup et exécute le scraper dans le contexte de la page.
 */

// Écoute des messages venant du popup ou du background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scanDocuments') {
    try {
      if (typeof MoodleScraper === 'undefined') {
        sendResponse({ success: false, error: 'MoodleScraper non chargé' });
        return true;
      }

      const results = MoodleScraper.extractDocuments(document);
      sendResponse({ success: true, data: results });
    } catch (err) {
      console.error('[MoodleSmartDownloader] Erreur lors de l\'extraction :', err);
      sendResponse({ success: false, error: err.message });
    }
    return true; // Asynchrone
  }

  // Téléchargement d'un fichier via fetch avec cookies de session de la page
  if (request.action === 'fetchBlob') {
    fetch(request.url, {
      credentials: 'include',
      redirect: 'follow'
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status} : ${response.statusText}`);
        }
        const blob = await response.blob();
        
        // Lire sous forme de DataURL pour le transmettre via chrome.runtime
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
          sendResponse({ success: false, error: 'Échec de conversion du Blob' });
        };
        reader.readAsDataURL(blob);
      })
      .catch((err) => {
        console.error('[MoodleSmartDownloader] Échec du fetch :', err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Asynchrone
  }
});
