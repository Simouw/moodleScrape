# 🎓 Moodle Smart Downloader

> A high-performance browser extension for intelligent detection, multi-level section hierarchy extraction, sub-page crawling, contextual renaming, and in-page direct downloads on Moodle.

---

## 🌟 Key Features

* **🖥️ Seamless In-Page Drawer (No New Tab Required):**
  Click the toolbar icon on any Moodle course page to toggle an elegant in-page drawer. Clicking **"Choose Folder & Download"** opens your native OS folder chooser directly over the Moodle tab—**zero new browser tabs are opened, and the window never closes unexpectedly!**
* **📂 Multi-Level Section & Tab Hierarchy:**
  Properly resolves full section paths across tabs, sub-tabs, and breadcrumbs:
  * `Cours / LaTeX et Git/GitLab`
  * `Travaux pratiques / TP5`
  * `Travaux dirigés`
* **🕸️ Automatic Sub-Page Crawling (e.g. GCC-DDD):**
  When a section links to Moodle activity sub-pages (such as `/mod/page/`, `/mod/folder/`, or assignments like `GCC-DDD`), the extension automatically fetches and extracts the embedded files (PDFs, `.tar.gz`, `.zip`, etc.) inside them and prefixes their names cleanly (e.g. `GCC-DDD - Sujet détaillé.pdf`, `GCC-DDD - Jeu du snake.tar.gz`).
* **🧠 Smart Contextual Renaming:**
  Transforms generic labels like *"Fichier PDF"* into descriptive, structured filenames based on ancestor headings, exam years, and subject vs. correction roles.
* **📁 Native Local Folder Selection (File System Access API):**
  Pick any folder on your machine and stream files directly into it.
* **✏️ Inline Renaming & Filtering:**
  Every file name is fully editable directly inside the list before downloading. Filter files in real time (e.g. `2015`, `TP1`, `Exam`).
* **🔐 Zero-Credential Session Handling:**
  Runs within your active authenticated session cookies using `credentials: 'include'`.

---

## 📦 Installation Guide

### Chrome / Brave / Edge / Chromium

1. Open your browser and navigate to:
   * **Chrome / Brave:** `chrome://extensions/`
   * **Edge:** `edge://extensions/`
2. Enable **Developer Mode** (toggle in the top-right corner).
3. Click **"Load unpacked"** (or *Charger l'extension non empaquetée*).
4. Select the project directory:
   ```bash
   /home/cmo/code/moodleScrape
   ```
5. Pin **Moodle Smart Downloader** to your extensions bar!

---

## 🛠️ Usage Walkthrough

1. Go to any Moodle course section where you are logged in.
2. Click the extension icon in your browser toolbar:
   * The drawer smoothly slides in right on the Moodle page.
   * It scans the active section, discovers sub-tabs, and crawls linked sub-pages (e.g. `GCC-DDD`).
3. Customize file selections or tweak any filename if needed.
4. Click **"Choose Folder & Download"**:
   * Pick your target folder in your OS file dialog.
   * Files download with real-time progress indicators right on your screen without leaving the page!

---

## 📂 Project Architecture

```
moodleScrape/
├── manifest.json            # Manifest V3 extension configuration
├── icons/                   # High-res extension icons (16, 32, 48, 128px)
├── src/
│   ├── scraper.js           # DOM hierarchy, multi-level tabs & sub-page crawler
│   ├── content.js           # In-page slide-out drawer (Shadow DOM) & page bridge
│   └── background.js        # Action click handler & Chrome downloads fallback
├── popup/
│   ├── popup.html           # Standalone popup interface (fallback)
│   ├── popup.css            # Extension styling
│   └── popup.js             # Standalone UI controller
├── test/
│   ├── test_scraper.js      # Unit tests for exam archive pages
│   ├── test_other_formats.js# Unit tests for standard activity items
│   └── test_hierarchy.js    # Unit tests for multi-level tabs & sub-page crawling
└── README.md
```

---

## 🧪 Running Automated Tests

Run the full test suite with Node.js:
```bash
node test/test_scraper.js
node test/test_other_formats.js
node test/test_hierarchy.js
```

---

## 📄 License

MIT License.
