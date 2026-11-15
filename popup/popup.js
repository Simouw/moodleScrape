/**
 * popup.js - Extension UI Controller (English)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
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
  const progressContainerEl = document.getElementById('progress-container');
  const progressBarFillEl = document.getElementById('progress-bar-fill');
  const progressTextEl = document.getElementById('progress-text');
  const progressPercentEl = document.getElementById('progress-percent');

  // Full-tab / dedicated tab mode detection
  const urlParams = new URLSearchParams(window.location.search);
  const isFullTab = urlParams.get('tab') === '1';
  const shouldPickFolderImmediately = urlParams.get('pickFolder') === '1';
  const forcedSourceTabId = urlParams.get('sourceTabId') ? parseInt(urlParams.get('sourceTabId'), 10) : null;

  // Load preferences
  const prefs = await chrome.storage.local.get(['optAlwaysTab', 'optSubfolder']);
  if (prefs.optAlwaysTab) {
    optAlwaysTabEl.checked = true;
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

  // Local state
  let currentTabId = forcedSourceTabId;
  let courseData = {
    courseTitle: '',
    activeSection: '',
    items: []
  };
  let isDownloading = false;

  // Detach / Expand into a full tab
  btnDetachEl.addEventListener('click', async () => {
    await saveTransferState();
    chrome.tabs.create({
      url: chrome.runtime.getURL(`popup/popup.html?tab=1&sourceTabId=${currentTabId || ''}`)
    });
    window.close();
  });

  // Get Moodle target tab
  async function getTargetTab() {
    if (currentTabId) {
      try {
        const tab = await chrome.tabs.get(currentTabId);
        if (tab) return tab;
      } catch (e) {
        // Tab closed or invalid
      }
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  // Save state for popup-to-tab transfer
  async function saveTransferState() {
    await chrome.storage.local.set({
      moodleTransferState: {
        courseData,
        currentTabId,
        optSubfolder: optSubfolderEl.checked
      }
    });
  }

  // Initialization: check transfer state or scan active tab
  async function initialize() {
    if (isFullTab) {
      const saved = await chrome.storage.local.get('moodleTransferState');
      if (saved && saved.moodleTransferState && saved.moodleTransferState.courseData) {
        courseData = saved.moodleTransferState.courseData;
        currentTabId = saved.moodleTransferState.currentTabId || currentTabId;
        optSubfolderEl.checked = saved.moodleTransferState.optSubfolder ?? true;

        await chrome.storage.local.remove('moodleTransferState');
        handleScanSuccess(courseData);

        if (shouldPickFolderImmediately) {
          btnDownloadFolder.scrollIntoView({ behavior: 'smooth' });
          btnDownloadFolder.focus();
        }
        return;
      }
    }

    initScan();
  }

  // Scan Moodle page
  async function initScan() {
    loadingStateEl.classList.remove('hidden');
    emptyStateEl.classList.add('hidden');
    fileListEl.innerHTML = '';

    const tab = await getTargetTab();
    if (!tab || !tab.id) {
      showError("Unable to access Moodle tab. Make sure the course page is open.");
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
                  showError("Unable to scan page. Verify this is a valid Moodle course page.");
                } else {
                  handleScanSuccess(resp2.data);
                }
              });
            }, 100);
          } catch (injectErr) {
            showError("Access error: " + injectErr.message);
          }
        } else {
          handleScanSuccess(response.data);
        }
      });
    } catch (err) {
      showError("Error: " + err.message);
    }
  }

  function showError(msg) {
    loadingStateEl.classList.add('hidden');
    emptyStateEl.classList.remove('hidden');
    const p = emptyStateEl.querySelector('p');
    if (p) p.textContent = msg;
  }

  // Handle scanned results
  function handleScanSuccess(data) {
    loadingStateEl.classList.add('hidden');
    courseData = data;

    courseNameEl.textContent = data.courseTitle || 'Moodle Course';
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

  // Render file list
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
      emptyStateEl.querySelector('p').textContent = 'No files match your filter.';
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

      // Details container
      const details = document.createElement('div');
      details.className = 'file-details';

      // Context Tag
      const ctxRow = document.createElement('div');
      ctxRow.className = 'file-context-row';

      if (item.contextPath) {
        const tag = document.createElement('span');
        tag.className = 'context-tag';
        tag.textContent = item.contextPath;
        tag.title = item.contextPath;
        ctxRow.appendChild(tag);
      }

      // Editable file name input
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'file-name-input';
      nameInput.value = item.filename;
      nameInput.title = "Target filename (editable)";
      nameInput.addEventListener('input', (e) => {
        item.filename = e.target.value.trim();
      });

      // Actions & Status
      const actionsRow = document.createElement('div');
      actionsRow.className = 'file-actions';

      const statusBadge = document.createElement('span');
      statusBadge.className = 'status-badge ready';
      statusBadge.id = `status-${item.id}`;
      statusBadge.textContent = 'Ready';

      const linkBtn = document.createElement('a');
      linkBtn.href = item.url;
      linkBtn.target = '_blank';
      linkBtn.className = 'link-btn';
      linkBtn.title = "Open original link";
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

  // Filters & selection toggles
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

    selectionCountEl.textContent = `Selection (${selectedCount}/${totalCount})`;
    checkAllEl.checked = selectedCount > 0 && selectedCount === totalCount;
    checkAllEl.indeterminate = selectedCount > 0 && selectedCount < totalCount;

    updateButtonStates();
  }

  function updateButtonStates() {
    const selectedCount = courseData.items.filter(i => i.selected).length;
    const disabled = selectedCount === 0 || isDownloading;

    btnDownloadFolder.disabled = disabled;
    btnDownloadChrome.disabled = disabled;

    btnDownloadFolder.querySelector('span').textContent = `Choose Folder & Download (${selectedCount})`;
    btnDownloadChrome.querySelector('span').textContent = `Direct Chrome Downloads (${selectedCount})`;
  }

  // Fetch file Blob using session cookies
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
  // OPTION A: File System Access API (Local Folder Picker)
  // =========================================================================
  btnDownloadFolder.addEventListener('click', async () => {
    const selectedItems = courseData.items.filter(i => i.selected);
    if (selectedItems.length === 0) return;

    // Chromium popup behavior on Linux/Windows:
    // Opening native file chooser from popup causes popup to blur and close immediately.
    // Solution: If in popup, seamlessly transfer state to a dedicated tab where picker never closes.
    if (!isFullTab) {
      await saveTransferState();
      chrome.tabs.create({
        url: chrome.runtime.getURL(`popup/popup.html?tab=1&pickFolder=1&sourceTabId=${currentTabId || ''}`)
      });
      window.close();
      return;
    }

    if (!('showDirectoryPicker' in window)) {
      alert("Your browser does not support the File System Access API. Please use Direct Chrome Downloads.");
      return;
    }

    let rootDirHandle;
    try {
      rootDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // User cancelled
      }
      alert("Error accessing selected folder: " + err.message);
      return;
    }

    // Subfolder handling
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
        console.warn("Could not create subfolder, saving to root folder instead:", subErr);
        targetDirHandle = rootDirHandle;
      }
    }

    // Batch download
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
  // OPTION B: Direct Chrome Downloads (chrome.downloads API)
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
            reject(new Error(res?.error || chrome.runtime.lastError?.message || 'Download error'));
          } else {
            resolve();
          }
        });
      });
    });
  });

  // Batch download runner with live progress bar
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
        statusBadge.textContent = 'Downloading...';
      }

      progressTextEl.textContent = `Downloading ${i + 1}/${total}: ${item.filename}`;
      const percent = Math.round(((i) / total) * 100);
      progressBarFillEl.style.width = `${percent}%`;
      progressPercentEl.textContent = `${percent}%`;

      try {
        await downloadFunction(item);
        completed++;
        if (statusBadge) {
          statusBadge.className = 'status-badge success';
          statusBadge.textContent = '✓ Saved';
        }
      } catch (err) {
        console.error(`Failed for ${item.filename}:`, err);
        errors++;
        if (statusBadge) {
          statusBadge.className = 'status-badge error';
          statusBadge.textContent = '✗ Error';
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
      progressTextEl.textContent = `Completed! ${completed} file(s) saved successfully.`;
    } else {
      progressTextEl.textContent = `Finished with ${completed} succeeded and ${errors} error(s).`;
    }
  }

  // Start initialization
  initialize();
});
