/**
 * popup.js - Contrôleur de l'interface utilisateur de l'extension
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Éléments du DOM
  const courseNameEl = document.getElementById('course-name');
  const sectionNameEl = document.getElementById('section-name');
  const sectionRowEl = document.getElementById('section-row');
  const fileListEl = document.getElementById('file-list');
  const loadingStateEl = document.getElementById('loading-state');
  const emptyStateEl = document.getElementById('empty-state');
  const checkAllEl = document.getElementById('check-all');
  const selectionCountEl = document.getElementById('selection-count');
  const filterInputEl = document.getElementById('filter-input');
  const btnRefreshEl = document.getElementById('btn-refresh');
  const btnDetachEl = document.getElementById('btn-detach');
  const btnDownloadFolder = document.getElementById('btn-download-folder');
  const btnDownloadChrome = document.getElementById('btn-download-chrome');
  const optSubfolderEl = document.getElementById('opt-subfolder');
  const optAlwaysTabEl = document.getElementById('opt-always-tab');
  const tabNoticeEl = document.getElementById('tab-notice');
  const progressContainerEl = document.getElementById('progress-container');
  const progressBarFillEl = document.getElementById('progress-bar-fill');
  const progressTextEl = document.getElementById('progress-text');
  const progressPercentEl = document.getElementById('progress-percent');

  // Gestion du mode pleine page / onglet dédié
  const urlParams = new URLSearchParams(window.location.search);
  const isFullTab = urlParams.get('tab') === '1';
  const shouldPickFolderImmediately = urlParams.get('pickFolder') === '1';
  const forcedSourceTabId = urlParams.get('sourceTabId') ? parseInt(urlParams.get('sourceTabId'), 10) : null;

  // Charger la préférence "Toujours ouvrir dans un onglet"
  const prefs = await chrome.storage.local.get(['optAlwaysTab', 'optSubfolder']);
  if (prefs.optAlwaysTab) {
    optAlwaysTabEl.checked = true;
    // Si on est dans le popup volatile et que la préférence est cochée, basculer immédiatement vers l'onglet
    if (!isFullTab) {
      const tab = await getTargetTab();
      chrome.tabs.create({
        url: chrome.runtime.getURL(`popup/popup.html?tab=1&sourceTabId=${tab?.id || ''}`)
      });
      window.close();
      return;
    }
  }

  if (prefs.optSubfolder !== undefined) {
    optSubfolderEl.checked = prefs.optSubfolder;
  }

  optAlwaysTabEl.addEventListener('change', () => {
    chrome.storage.local.set({ optAlwaysTab: optAlwaysTabEl.checked });
  });

  optSubfolderEl.addEventListener('change', () => {
    chrome.storage.local.set({ optSubfolder: optSubfolderEl.checked });
  });

  if (isFullTab) {
    document.body.classList.add('full-tab');
    if (btnDetachEl) btnDetachEl.style.display = 'none';
  }

  // État local
  let currentTabId = forcedSourceTabId;
  let courseData = {
    courseTitle: '',
    activeSection: '',
    items: []
  };
  let isDownloading = false;

  // Bouton Détacher / Agrandir dans un onglet
  btnDetachEl.addEventListener('click', async () => {
    await saveTransferState();
    chrome.tabs.create({
      url: chrome.runtime.getURL(`popup/popup.html?tab=1&sourceTabId=${currentTabId || ''}`)
    });
    window.close();
  });

  // Obtenir l'onglet cible (la page Moodle)
  async function getTargetTab() {
    if (currentTabId) {
      try {
        const tab = await chrome.tabs.get(currentTabId);
        if (tab) return tab;
      } catch (e) {
        // Tab fermé ou invalide
      }
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  // Sauvegarder l'état actuel pour le transfert entre popup et onglet
  async function saveTransferState() {
    await chrome.storage.local.set({
      moodleTransferState: {
        courseData,
        currentTabId,
        optSubfolder: optSubfolderEl.checked
      }
    });
  }

  // Initialisation : vérifier s'il y a un état transféré ou scanner la page
  async function initialize() {
    // Si on est en mode onglet et qu'on vient d'un transfert depuis le popup
    if (isFullTab) {
      const saved = await chrome.storage.local.get('moodleTransferState');
      if (saved && saved.moodleTransferState && saved.moodleTransferState.courseData) {
        courseData = saved.moodleTransferState.courseData;
        currentTabId = saved.moodleTransferState.currentTabId || currentTabId;
        optSubfolderEl.checked = saved.moodleTransferState.optSubfolder ?? true;

        // Nettoyer l'état transféré
        await chrome.storage.local.remove('moodleTransferState');

        handleScanSuccess(courseData);

        if (shouldPickFolderImmediately) {
          tabNoticeEl.classList.remove('hidden');
          btnDownloadFolder.scrollIntoView({ behavior: 'smooth' });
          btnDownloadFolder.focus();
        }
        return;
      }
    }

    // Sinon scan standard
    initScan();
  }

  // Scan de la page Moodle
  async function initScan() {
    loadingStateEl.classList.remove('hidden');
    emptyStateEl.classList.add('hidden');
    fileListEl.innerHTML = '';

    const tab = await getTargetTab();
    if (!tab || !tab.id) {
      showError("Impossible d'accéder à la page Moodle. Vérifiez que l'onglet du cours est ouvert.");
      return;
    }
    currentTabId = tab.id;

    try {
      chrome.tabs.sendMessage(currentTabId, { action: 'scanDocuments' }, async (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: currentTabId },
              files: ['src/scraper.js', 'src/content.js']
            });

            setTimeout(() => {
              chrome.tabs.sendMessage(currentTabId, { action: 'scanDocuments' }, (resp2) => {
                if (chrome.runtime.lastError || !resp2 || !resp2.success) {
                  showError("Impossible d'analyser la page. Vérifiez qu'il s'agit bien d'une page de cours Moodle.");
                } else {
                  handleScanSuccess(resp2.data);
                }
              });
            }, 100);
          } catch (injectErr) {
            showError("Erreur d'accès à la page : " + injectErr.message);
          }
        } else {
          handleScanSuccess(response.data);
        }
      });
    } catch (err) {
      showError("Erreur : " + err.message);
    }
  }

  function showError(msg) {
    loadingStateEl.classList.add('hidden');
    emptyStateEl.classList.remove('hidden');
    const p = emptyStateEl.querySelector('p');
    if (p) p.textContent = msg;
  }

  // Traitement des résultats du scan
  function handleScanSuccess(data) {
    loadingStateEl.classList.add('hidden');
    courseData = data;

    courseNameEl.textContent = data.courseTitle || 'Cours Moodle';
    if (data.activeSection) {
      sectionNameEl.textContent = data.activeSection;
      sectionRowEl.style.display = 'flex';
    } else {
      sectionRowEl.style.display = 'none';
    }

    if (!data.items || data.items.length === 0) {
      emptyStateEl.classList.remove('hidden');
      updateButtonStates();
      return;
    }

    renderFileList();
    updateButtonStates();
  }

  // Rendu de la liste des fichiers
  function renderFileList() {
    fileListEl.innerHTML = '';
    const filterText = filterInputEl.value.trim().toLowerCase();

    const filteredItems = courseData.items.filter(item => {
      if (!filterText) return true;
      return (
        item.filename.toLowerCase().includes(filterText) ||
        (item.contextPath && item.contextPath.toLowerCase().includes(filterText)) ||
        (item.originalText && item.originalText.toLowerCase().includes(filterText))
      );
    });

    if (filteredItems.length === 0) {
      emptyStateEl.classList.remove('hidden');
      emptyStateEl.querySelector('p').textContent = 'Aucun fichier ne correspond à votre filtre.';
    } else {
      emptyStateEl.classList.add('hidden');
    }

    filteredItems.forEach((item) => {
      const card = document.createElement('div');
      card.className = `file-card ${item.selected ? 'selected' : ''}`;
      card.id = `card-${item.id}`;

      // Checkbox
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'file-checkbox';
      chk.checked = item.selected;
      chk.addEventListener('change', () => {
        item.selected = chk.checked;
        card.classList.toggle('selected', item.selected);
        updateSelectionStats();
      });

      // Contenu
      const details = document.createElement('div');
      details.className = 'file-details';

      // Badge contextuel
      const ctxRow = document.createElement('div');
      ctxRow.className = 'file-context-row';

      if (item.contextPath) {
        const tag = document.createElement('span');
        tag.className = 'context-tag';
        tag.textContent = item.contextPath;
        tag.title = item.contextPath;
        ctxRow.appendChild(tag);
      }

      // Champ de renommage éditable
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'file-name-input';
      nameInput.value = item.filename;
      nameInput.title = "Nom du fichier (modifiable directement)";
      nameInput.addEventListener('input', (e) => {
        item.filename = e.target.value.trim();
      });

      // Actions & Statut
      const actionsRow = document.createElement('div');
      actionsRow.className = 'file-actions';

      const statusBadge = document.createElement('span');
      statusBadge.className = 'status-badge ready';
      statusBadge.id = `status-${item.id}`;
      statusBadge.textContent = 'Prêt';

      const linkBtn = document.createElement('a');
      linkBtn.href = item.url;
      linkBtn.target = '_blank';
      linkBtn.className = 'link-btn';
      linkBtn.title = "Ouvrir le lien original";
      linkBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      `;

      actionsRow.appendChild(statusBadge);
      actionsRow.appendChild(linkBtn);

      details.appendChild(ctxRow);
      details.appendChild(nameInput);
      details.appendChild(actionsRow);

      card.appendChild(chk);
      card.appendChild(details);

      fileListEl.appendChild(card);
    });

    updateSelectionStats();
  }

  // Filtres et sélection globale
  filterInputEl.addEventListener('input', () => {
    renderFileList();
  });

  checkAllEl.addEventListener('change', () => {
    const isChecked = checkAllEl.checked;
    courseData.items.forEach(item => item.selected = isChecked);
    renderFileList();
  });

  btnRefreshEl.addEventListener('click', () => {
    initScan();
  });

  function updateSelectionStats() {
    const selectedCount = courseData.items.filter(i => i.selected).length;
    const totalCount = courseData.items.length;

    selectionCountEl.textContent = `Sélection (${selectedCount}/${totalCount})`;
    checkAllEl.checked = selectedCount > 0 && selectedCount === totalCount;
    checkAllEl.indeterminate = selectedCount > 0 && selectedCount < totalCount;

    updateButtonStates();
  }

  function updateButtonStates() {
    const selectedCount = courseData.items.filter(i => i.selected).length;
    const disabled = selectedCount === 0 || isDownloading;

    btnDownloadFolder.disabled = disabled;
    btnDownloadChrome.disabled = disabled;

    btnDownloadFolder.querySelector('span').textContent = `📁 Choisir un dossier & Télécharger (${selectedCount})`;
    btnDownloadChrome.querySelector('span').textContent = `Téléchargements Chrome direct (${selectedCount})`;
  }

  // Récupération d'un fichier (Blob) avec cookies de session
  async function fetchFileBlob(url) {
    try {
      const res = await fetch(url, { credentials: 'include', redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    } catch (directErr) {
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(currentTabId, { action: 'fetchBlob', url }, (resp) => {
          if (chrome.runtime.lastError || !resp || !resp.success) {
            reject(new Error(resp?.error || directErr.message));
          } else {
            fetch(resp.dataUrl)
              .then(r => r.blob())
              .then(resolve)
              .catch(reject);
          }
        });
      });
    }
  }

  // =========================================================================
  // OPTION A : Téléchargement avec choix de dossier (File System Access API)
  // =========================================================================
  btnDownloadFolder.addEventListener('click', async () => {
    const selectedItems = courseData.items.filter(i => i.selected);
    if (selectedItems.length === 0) return;

    // RÈGLE CHROMIUM IMPORTANTE :
    // Sous Linux et Windows, ouvrir le sélecteur de fichiers OS depuis une petite bulle popup
    // fait perdre le focus à la bulle, ce qui provoque la fermeture immédiate de la popup par Chrome.
    // Solution : Si on est dans la popup, on transfère l'état et on ouvre l'onglet dédié où la boîte ne se fermera JAMAIS.
    if (!isFullTab) {
      await saveTransferState();
      chrome.tabs.create({
        url: chrome.runtime.getURL(`popup/popup.html?tab=1&pickFolder=1&sourceTabId=${currentTabId || ''}`)
      });
      window.close();
      return;
    }

    // Nous sommes dans un onglet dédié sécurisé : l'OS picker peut s'ouvrir sereinement
    tabNoticeEl.classList.add('hidden');

    if (!('showDirectoryPicker' in window)) {
      alert("Votre navigateur ne supporte pas l'API File System Access. Utilisez le bouton Téléchargements Chrome.");
      return;
    }

    let rootDirHandle;
    try {
      rootDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (err) {
      if (err.name === 'AbortError') {
        // Choix annulé par l'utilisateur
        return;
      }
      alert("Erreur d'accès au dossier : " + err.message);
      return;
    }

    // Gestion du sous-dossier éventuel
    let targetDirHandle = rootDirHandle;
    if (optSubfolderEl.checked) {
      const folderNameParts = [];
      if (courseData.courseTitle) folderNameParts.push(courseData.courseTitle);
      if (courseData.activeSection) folderNameParts.push(courseData.activeSection);
      let subDirName = folderNameParts.join(' - ');
      subDirName = MoodleScraper.sanitizeFilename(subDirName) || 'Moodle_Export';

      try {
        targetDirHandle = await rootDirHandle.getDirectoryHandle(subDirName, { create: true });
      } catch (subErr) {
        console.warn("Sous-dossier non créé, écriture à la racine :", subErr);
        targetDirHandle = rootDirHandle;
      }
    }

    // Téléchargement et écriture directe dans le dossier
    startBatchDownload(selectedItems, async (item) => {
      const blob = await fetchFileBlob(item.url);
      const cleanName = MoodleScraper.sanitizeFilename(item.filename) || item.defaultFilename;
      const fileHandle = await targetDirHandle.getFileHandle(cleanName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    });
  });

  // =========================================================================
  // OPTION B : Téléchargement direct sans boîte de dialogue (chrome.downloads)
  // =========================================================================
  btnDownloadChrome.addEventListener('click', async () => {
    const selectedItems = courseData.items.filter(i => i.selected);
    if (selectedItems.length === 0) return;

    const folderNameParts = ['Moodle'];
    if (optSubfolderEl.checked) {
      if (courseData.courseTitle) folderNameParts.push(MoodleScraper.sanitizeFilename(courseData.courseTitle));
      if (courseData.activeSection) folderNameParts.push(MoodleScraper.sanitizeFilename(courseData.activeSection));
    }
    const prefixPath = folderNameParts.join('/');

    startBatchDownload(selectedItems, async (item) => {
      const cleanName = MoodleScraper.sanitizeFilename(item.filename) || item.defaultFilename;
      const fullPath = `${prefixPath}/${cleanName}`;

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'downloadViaChrome',
          url: item.url,
          filename: fullPath
        }, (res) => {
          if (chrome.runtime.lastError || !res || !res.success) {
            reject(new Error(res?.error || chrome.runtime.lastError?.message || 'Erreur download'));
          } else {
            resolve();
          }
        });
      });
    });
  });

  // Gestionnaire de téléchargement par lot avec barre de progression
  async function startBatchDownload(itemsToDownload, downloadFunction) {
    isDownloading = true;
    updateButtonStates();
    progressContainerEl.classList.remove('hidden');

    const total = itemsToDownload.length;
    let completed = 0;
    let errors = 0;

    for (let i = 0; i < total; i++) {
      const item = itemsToDownload[i];
      const statusBadge = document.getElementById(`status-${item.id}`);

      if (statusBadge) {
        statusBadge.className = 'status-badge downloading';
        statusBadge.textContent = 'Téléchargement...';
      }

      progressTextEl.textContent = `Téléchargement ${i + 1}/${total} : ${item.filename}`;
      const percent = Math.round(((i) / total) * 100);
      progressBarFillEl.style.width = `${percent}%`;
      progressPercentEl.textContent = `${percent}%`;

      try {
        await downloadFunction(item);
        completed++;
        if (statusBadge) {
          statusBadge.className = 'status-badge success';
          statusBadge.textContent = '✓ Enregistré';
        }
      } catch (err) {
        console.error(`Échec pour ${item.filename} :`, err);
        errors++;
        if (statusBadge) {
          statusBadge.className = 'status-badge error';
          statusBadge.textContent = '✗ Erreur';
          statusBadge.title = err.message;
        }
      }

      await new Promise(r => setTimeout(r, 150));
    }

    progressBarFillEl.style.width = '100%';
    progressPercentEl.textContent = '100%';
    isDownloading = false;
    updateButtonStates();

    if (errors === 0) {
      progressTextEl.textContent = `🎉 Terminé ! ${completed} fichier(s) enregistré(s) avec succès.`;
    } else {
      progressTextEl.textContent = `⚠️ Terminé avec ${completed} succès et ${errors} erreur(s).`;
    }
  }

  // Démarrage
  initialize();
});
