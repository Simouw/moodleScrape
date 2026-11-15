/**
 * content.js - Moodle Smart Downloader In-Page Drawer & Scraper Integration
 * Injects a clean, spacious slide-out drawer directly on the Moodle page.
 * Includes an "Expand to New Tab" button for full-screen dedicated mode.
 */

(function () {
  let drawerRoot = null;
  let shadowRoot = null;
  let isDrawerOpen = false;
  let scannedData = null;
  let isDownloading = false;

  // Toggle or open the drawer on the current Moodle page
  function toggleDrawer() {
    if (!drawerRoot) {
      createDrawer();
    }
    isDrawerOpen = !isDrawerOpen;
    const container = shadowRoot.getElementById('moodle-drawer-container');
    if (isDrawerOpen) {
      container.classList.add('open');
      startScan();
    } else {
      container.classList.remove('open');
    }
  }

  // Create isolated Shadow DOM drawer
  function createDrawer() {
    drawerRoot = document.createElement('div');
    drawerRoot.id = 'moodle-smart-downloader-root';
    document.body.appendChild(drawerRoot);

    shadowRoot = drawerRoot.attachShadow({ mode: 'open' });

    // Styles inside Shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.45;
        color: #111827;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }

      #moodle-drawer-container {
        position: fixed;
        top: 0;
        right: -630px;
        width: 600px;
        max-width: 95vw;
        height: 100vh;
        background: #ffffff;
        box-shadow: -8px 0 30px rgba(0,0,0,0.22);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        transition: right 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #moodle-drawer-container.open {
        right: 0;
      }

      /* Header */
      .drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: #ffffff;
        border-bottom: 1px solid #e5e7eb;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .brand-title {
        font-size: 17px;
        font-weight: 700;
        color: #111827;
        line-height: 1.2;
      }
      .brand-tag {
        font-size: 11px;
        font-weight: 600;
        color: #f27217;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .header-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .icon-action-btn {
        background: #f8fafc;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        cursor: pointer;
        color: #4b5563;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 9px;
        transition: all 0.15s ease;
      }
      .icon-action-btn:hover {
        background: #f1f5f9;
        color: #f27217;
        border-color: #cbd5e1;
      }
      .close-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 22px;
        line-height: 1;
        color: #6b7280;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.15s ease;
      }
      .close-btn:hover { background: #fee2e2; color: #ef4444; }

      /* Metadata */
      .meta-box {
        padding: 12px 20px;
        background: #f8fafc;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .meta-row { display: flex; align-items: baseline; gap: 10px; }
      .meta-label { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; min-width: 65px; letter-spacing: 0.3px; }
      .meta-value { font-size: 14px; font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .meta-badge {
        font-size: 12px;
        font-weight: 600;
        color: #1e40af;
        background: #dbeafe;
        padding: 3px 10px;
        border-radius: 12px;
        max-width: 480px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Toolbar */
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 20px;
        background: #fafafa;
        border-bottom: 1px solid #e5e7eb;
        gap: 12px;
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        user-select: none;
      }
      .checkbox-label input { cursor: pointer; accent-color: #f27217; width: 17px; height: 17px; }
      .search-box {
        padding: 6px 12px;
        font-size: 13px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        outline: none;
        width: 190px;
      }
      .search-box:focus { border-color: #f27217; box-shadow: 0 0 0 2px rgba(242,114,23,0.15); }
      .refresh-btn {
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 6px 10px;
        cursor: pointer;
        color: #4b5563;
        font-size: 13px;
      }
      .refresh-btn:hover { background: #f3f4f6; color: #111827; }

      /* File List Area */
      .file-list-area {
        flex: 1;
        overflow-y: auto;
        padding: 14px 20px;
      }
      .state-msg {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        color: #6b7280;
        gap: 12px;
        font-size: 14px;
      }
      .spinner {
        width: 26px;
        height: 26px;
        border: 3px solid rgba(242, 114, 23, 0.2);
        border-top-color: #f27217;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .hidden { display: none !important; }

      /* Card Items */
      .card-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 10px 12px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 10px;
        transition: all 0.15s ease;
      }
      .card-item:hover { border-color: #cbd5e1; background: #fafbfc; }
      .card-item.selected { border-color: #fdba74; background: #fffaf5; }
      .card-chk { margin-top: 5px; accent-color: #f27217; cursor: pointer; width: 17px; height: 17px; }
      .card-body { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
      .context-tag {
        font-size: 11px;
        font-weight: 600;
        background: #e2e8f0;
        color: #334155;
        padding: 2px 8px;
        border-radius: 4px;
        max-width: 400px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .subpage-badge {
        font-size: 10px;
        font-weight: 700;
        background: #fef08a;
        color: #854d0e;
        padding: 2px 7px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .filename-input {
        width: 100%;
        font-size: 13px;
        font-weight: 500;
        color: #111827;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 6px 10px;
        outline: none;
        transition: all 0.15s ease;
      }
      .filename-input:focus { border-color: #f27217; box-shadow: 0 0 0 2px rgba(242,114,23,0.15); }
      .card-footer { display: flex; align-items: center; gap: 8px; }
      .status-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
      .status-tag.ready { color: #9ca3af; }
      .status-tag.downloading { color: #d97706; background: #fef3c7; }
      .status-tag.success { color: #065f46; background: #d1fae5; }
      .status-tag.error { color: #991b1b; background: #fee2e2; }

      /* Options */
      .options-bar {
        padding: 10px 20px;
        background: #f8fafc;
        border-top: 1px solid #e5e7eb;
        font-size: 12px;
        color: #4b5563;
      }
      .options-bar label { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
      .options-bar input { accent-color: #f27217; width: 16px; height: 16px; }

      /* Progress Box */
      .progress-box {
        padding: 10px 20px;
        background: #fffaf0;
        border-top: 1px solid #fed7aa;
      }
      .progress-bar-bg { width: 100%; height: 7px; background: #ffedd5; border-radius: 4px; overflow: hidden; }
      .progress-bar-fill { height: 100%; background: #f27217; transition: width 0.2s ease; width: 0%; }
      .progress-desc { display: flex; justify-content: space-between; font-size: 12px; color: #9a3412; margin-top: 5px; font-weight: 500; }

      /* Footer */
      .drawer-footer {
        padding: 14px 20px;
        background: #ffffff;
        border-top: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 11px 18px;
        font-size: 14px;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn-primary { background: #f27217; color: #ffffff; }
      .btn-primary:hover:not(:disabled) { background: #da600e; box-shadow: 0 2px 6px rgba(242,114,23,0.3); }
      .btn-secondary { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; font-size: 12px; padding: 8px 14px; }
      .btn-secondary:hover:not(:disabled) { background: #e5e7eb; color: #111827; }
    `;
    shadowRoot.appendChild(style);

    // HTML Structure with Expand / New Tab Button
    const container = document.createElement('div');
    container.id = 'moodle-drawer-container';
    container.innerHTML = `
      <div class="drawer-header">
        <div class="brand">
          <div>
            <div class="brand-title">Moodle Downloader</div>
            <div class="brand-tag">Smart Renaming</div>
          </div>
        </div>
        <div class="header-controls">
          <button id="drawer-expand-btn" class="icon-action-btn" title="Open in a dedicated full tab (User choice)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            <span style="font-size: 11px; font-weight: 600; margin-left: 5px;">New Tab</span>
          </button>
          <button id="close-drawer-btn" class="close-btn" title="Close">✕</button>
        </div>
      </div>

      <div class="meta-box">
        <div class="meta-row">
          <span class="meta-label">Course:</span>
          <span id="drawer-course-name" class="meta-value">Detecting...</span>
        </div>
        <div class="meta-row" id="drawer-section-row">
          <span class="meta-label">Section:</span>
          <span id="drawer-section-name" class="meta-badge">Detecting...</span>
        </div>
      </div>

      <div class="toolbar">
        <label class="checkbox-label">
          <input type="checkbox" id="drawer-check-all" checked>
          <span id="drawer-select-count">All (0)</span>
        </label>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="text" id="drawer-search-input" placeholder="Filter files..." class="search-box">
          <button id="drawer-refresh-btn" class="refresh-btn" title="Rescan page">↻</button>
        </div>
      </div>

      <div class="file-list-area">
        <div id="drawer-loading" class="state-msg">
          <div class="spinner"></div>
          <p id="drawer-loading-text">Scanning course & sub-pages...</p>
        </div>
        <div id="drawer-empty" class="state-msg hidden">
          <p>No downloadable documents found on this page or sub-pages.</p>
        </div>
        <div id="drawer-files"></div>
      </div>

      <div class="options-bar">
        <label>
          <input type="checkbox" id="drawer-opt-subfolder" checked>
          <span>Create subfolder per Course / Section</span>
        </label>
      </div>

      <div id="drawer-progress-box" class="progress-box hidden">
        <div class="progress-bar-bg">
          <div id="drawer-progress-fill" class="progress-bar-fill"></div>
        </div>
        <div class="progress-desc">
          <span id="drawer-progress-text">Waiting...</span>
          <span id="drawer-progress-percent">0%</span>
        </div>
      </div>

      <div class="drawer-footer">
        <button id="drawer-btn-download-folder" class="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          <span>Choose Folder & Download</span>
        </button>
        <button id="drawer-btn-download-chrome" class="btn btn-secondary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Direct Chrome Downloads</span>
        </button>
      </div>
    `;

    shadowRoot.appendChild(container);

    // Event listeners inside drawer
    shadowRoot.getElementById('close-drawer-btn').addEventListener('click', toggleDrawer);

    // Expand to dedicated new tab (User choice)
    shadowRoot.getElementById('drawer-expand-btn').addEventListener('click', async () => {
      if (scannedData) {
        await chrome.storage.local.set({
          moodleTransferState: {
            courseData: scannedData,
            optSubfolder: shadowRoot.getElementById('drawer-opt-subfolder').checked
          }
        });
      }
      chrome.runtime.sendMessage({ action: 'openDedicatedTab' });
      toggleDrawer();
    });

    shadowRoot.getElementById('drawer-check-all').addEventListener('change', (e) => {
      const checked = e.target.checked;
      if (scannedData && scannedData.items) {
        scannedData.items.forEach(i => i.selected = checked);
        renderDrawerFiles();
      }
    });

    shadowRoot.getElementById('drawer-search-input').addEventListener('input', () => {
      renderDrawerFiles();
    });

    shadowRoot.getElementById('drawer-refresh-btn').addEventListener('click', () => {
      startScan();
    });

    shadowRoot.getElementById('drawer-btn-download-folder').addEventListener('click', downloadWithFolderPicker);
    shadowRoot.getElementById('drawer-btn-download-chrome').addEventListener('click', downloadWithChromeApi);
  }

  // Scan current page and sub-pages
  async function startScan() {
    const loadingEl = shadowRoot.getElementById('drawer-loading');
    const emptyEl = shadowRoot.getElementById('drawer-empty');
    const filesEl = shadowRoot.getElementById('drawer-files');
    const courseEl = shadowRoot.getElementById('drawer-course-name');
    const sectionEl = shadowRoot.getElementById('drawer-section-name');
    const loadingText = shadowRoot.getElementById('drawer-loading-text');

    loadingEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    filesEl.innerHTML = '';
    loadingText.textContent = 'Scanning course & sub-pages...';

    try {
      const fetchHtml = async (url) => {
        try {
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) return null;
          return await res.text();
        } catch (e) {
          return null;
        }
      };

      scannedData = await MoodleScraper.extractAllDocuments(document, fetchHtml);

      courseEl.textContent = scannedData.courseTitle || 'Moodle Course';
      sectionEl.textContent = scannedData.activeSection || 'Current Section';

      loadingEl.classList.add('hidden');

      if (!scannedData.items || scannedData.items.length === 0) {
        emptyEl.classList.remove('hidden');
      } else {
        renderDrawerFiles();
      }
      updateDrawerButtonStats();
    } catch (err) {
      loadingEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      emptyEl.querySelector('p').textContent = 'Error scanning page: ' + err.message;
    }
  }

  // Render cards
  function renderDrawerFiles() {
    const filesEl = shadowRoot.getElementById('drawer-files');
    const filterText = shadowRoot.getElementById('drawer-search-input').value.trim().toLowerCase();
    filesEl.innerHTML = '';

    if (!scannedData || !scannedData.items) return;

    const filtered = scannedData.items.filter(item => {
      if (!filterText) return true;
      return (
        item.filename.toLowerCase().includes(filterText) ||
        (item.contextPath && item.contextPath.toLowerCase().includes(filterText)) ||
        (item.fromSubPage && item.fromSubPage.toLowerCase().includes(filterText))
      );
    });

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = `card-item ${item.selected ? 'selected' : ''}`;
      card.id = `drawer-card-${item.id}`;

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'card-chk';
      chk.checked = item.selected;
      chk.addEventListener('change', () => {
        item.selected = chk.checked;
        card.classList.toggle('selected', item.selected);
        updateDrawerButtonStats();
      });

      const body = document.createElement('div');
      body.className = 'card-body';

      const tagRow = document.createElement('div');
      tagRow.style.display = 'flex';
      tagRow.style.alignItems = 'center';
      tagRow.style.gap = '6px';

      if (item.fromSubPage) {
        const subBadge = document.createElement('span');
        subBadge.className = 'subpage-badge';
        subBadge.textContent = 'Page: ' + item.fromSubPage;
        tagRow.appendChild(subBadge);
      }

      if (item.contextPath) {
        const tag = document.createElement('span');
        tag.className = 'context-tag';
        tag.textContent = item.contextPath;
        tag.title = item.contextPath;
        tagRow.appendChild(tag);
      }

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'filename-input';
      input.value = item.filename;
      input.addEventListener('input', (e) => {
        item.filename = e.target.value.trim();
      });

      const footer = document.createElement('div');
      footer.className = 'card-footer';

      const statusTag = document.createElement('span');
      statusTag.className = 'status-tag ready';
      statusTag.id = `drawer-status-${item.id}`;
      statusTag.textContent = 'Ready';

      const linkBtn = document.createElement('a');
      linkBtn.href = item.url;
      linkBtn.target = '_blank';
      linkBtn.style.color = '#6b7280';
      linkBtn.style.textDecoration = 'none';
      linkBtn.style.fontSize = '12px';
      linkBtn.textContent = '↗ Link';

      footer.appendChild(statusTag);
      footer.appendChild(linkBtn);

      body.appendChild(tagRow);
      body.appendChild(input);
      body.appendChild(footer);

      card.appendChild(chk);
      card.appendChild(body);

      filesEl.appendChild(card);
    });

    updateDrawerButtonStats();
  }

  function updateDrawerButtonStats() {
    if (!scannedData || !scannedData.items) return;
    const selected = scannedData.items.filter(i => i.selected).length;
    const total = scannedData.items.length;

    const countEl = shadowRoot.getElementById('drawer-select-count');
    const chkAll = shadowRoot.getElementById('drawer-check-all');
    countEl.textContent = `Selection (${selected}/${total})`;
    chkAll.checked = selected > 0 && selected === total;
    chkAll.indeterminate = selected > 0 && selected < total;

    const btnFolder = shadowRoot.getElementById('drawer-btn-download-folder');
    const btnChrome = shadowRoot.getElementById('drawer-btn-download-chrome');
    const disabled = selected === 0 || isDownloading;

    btnFolder.disabled = disabled;
    btnChrome.disabled = disabled;

    btnFolder.querySelector('span').textContent = `Choose Folder & Download (${selected})`;
    btnChrome.querySelector('span').textContent = `Direct Chrome Downloads (${selected})`;
  }

  // OPTION A : showDirectoryPicker directly on the Moodle page
  async function downloadWithFolderPicker() {
    const selected = scannedData.items.filter(i => i.selected);
    if (selected.length === 0) return;

    if (!('showDirectoryPicker' in window)) {
      alert("Your browser does not support the File System Access API. Please use Direct Chrome Downloads.");
      return;
    }

    let rootHandle;
    try {
      rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (err) {
      if (err.name === 'AbortError') return;
      alert("Folder selection error: " + err.message);
      return;
    }

    let targetHandle = rootHandle;
    const optSubfolder = shadowRoot.getElementById('drawer-opt-subfolder').checked;
    if (optSubfolder) {
      const parts = [];
      if (scannedData.courseTitle) parts.push(scannedData.courseTitle);
      if (scannedData.activeSection) parts.push(scannedData.activeSection);
      let subDirName = MoodleScraper.sanitizeFilename(parts.join(' - ')) || 'Moodle_Export';

      try {
        targetHandle = await rootHandle.getDirectoryHandle(subDirName, { create: true });
      } catch (e) {
        targetHandle = rootHandle;
      }
    }

    await runBatchDownload(selected, async (item) => {
      const res = await fetch(item.url, { credentials: 'include', redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      const cleanName = MoodleScraper.sanitizeFilename(item.filename) || item.defaultFilename;
      const fileHandle = await targetHandle.getFileHandle(cleanName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    });
  }

  // OPTION B : chrome.downloads
  async function downloadWithChromeApi() {
    const selected = scannedData.items.filter(i => i.selected);
    if (selected.length === 0) return;

    const optSubfolder = shadowRoot.getElementById('drawer-opt-subfolder').checked;
    const folderParts = ['Moodle'];
    if (optSubfolder) {
      if (scannedData.courseTitle) folderParts.push(MoodleScraper.sanitizeFilename(scannedData.courseTitle));
      if (scannedData.activeSection) folderParts.push(MoodleScraper.sanitizeFilename(scannedData.activeSection));
    }
    const prefix = folderParts.join('/');

    await runBatchDownload(selected, async (item) => {
      const cleanName = MoodleScraper.sanitizeFilename(item.filename) || item.defaultFilename;
      const fullPath = `${prefix}/${cleanName}`;

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'downloadViaChrome', url: item.url, filename: fullPath }, (res) => {
          if (chrome.runtime.lastError || !res || !res.success) {
            reject(new Error(res?.error || 'Download failed'));
          } else {
            resolve();
          }
        });
      });
    });
  }

  // Batch runner with live progress
  async function runBatchDownload(items, downloadFn) {
    isDownloading = true;
    updateDrawerButtonStats();
    const progressBox = shadowRoot.getElementById('drawer-progress-box');
    const fillEl = shadowRoot.getElementById('drawer-progress-fill');
    const textEl = shadowRoot.getElementById('drawer-progress-text');
    const percentEl = shadowRoot.getElementById('drawer-progress-percent');

    progressBox.classList.remove('hidden');

    const total = items.length;
    let completed = 0;
    let errors = 0;

    for (let i = 0; i < total; i++) {
      const item = items[i];
      const statusTag = shadowRoot.getElementById(`drawer-status-${item.id}`);

      if (statusTag) {
        statusTag.className = 'status-tag downloading';
        statusTag.textContent = 'Downloading...';
      }

      textEl.textContent = `Downloading ${i + 1}/${total}: ${item.filename}`;
      const pct = Math.round((i / total) * 100);
      fillEl.style.width = `${pct}%`;
      percentEl.textContent = `${pct}%`;

      try {
        await downloadFn(item);
        completed++;
        if (statusTag) {
          statusTag.className = 'status-tag success';
          statusTag.textContent = '✓ Saved';
        }
      } catch (err) {
        errors++;
        if (statusTag) {
          statusTag.className = 'status-tag error';
          statusTag.textContent = '✗ Error';
          statusTag.title = err.message;
        }
      }

      await new Promise(r => setTimeout(r, 120));
    }

    fillEl.style.width = '100%';
    percentEl.textContent = '100%';
    isDownloading = false;
    updateDrawerButtonStats();

    if (errors === 0) {
      textEl.textContent = `Completed! ${completed} file(s) saved successfully.`;
    } else {
      textEl.textContent = `Finished with ${completed} succeeded and ${errors} error(s).`;
    }
  }

  // Message listener from background or popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleDrawer') {
      toggleDrawer();
      sendResponse({ success: true, isOpen: isDrawerOpen });
      return true;
    }

    if (request.action === 'scanDocuments') {
      const fetchHtml = async (url) => {
        try {
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) return null;
          return await res.text();
        } catch (e) {
          return null;
        }
      };

      MoodleScraper.extractAllDocuments(document, fetchHtml)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));

      return true;
    }

    if (request.action === 'fetchBlob') {
      fetch(request.url, { credentials: 'include', redirect: 'follow' })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            sendResponse({ success: true, dataUrl: reader.result, mimeType: blob.type, size: blob.size });
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => sendResponse({ success: false, error: err.message }));

      return true;
    }
  });

})();
