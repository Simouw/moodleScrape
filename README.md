# 🎓 Moodle Smart Downloader

> A modern browser extension (Chrome, Edge, Brave, Chromium) for intelligent detection, contextual renaming, and bulk downloading of documents on Moodle course pages.

---

## 🌟 The Problem It Solves

On many Moodle course pages, professors list dozens of documents where every link has the exact same generic text: **"Fichier PDF"**, or points to obscure resource IDs (`view.php?id=1234`). Downloading them with default browser tools results in an unorganized mess of `Fichier PDF (1).pdf`, `Fichier PDF (2).pdf`, etc.

**Moodle Smart Downloader** inspects the DOM hierarchy surrounding each link (course name, active tab/section, ancestor list items, year labels, sibling prefixes) and reconstructs clean, human-readable filenames:

* `2005-2006 - Midterm - Subject.pdf`
* `2005-2006 - Midterm - Correction.pdf`
* `2005-2006 - Exam - Subject.pdf`
* `2005-2006 - Exam - Correction.pdf`

---

## 🚀 Key Features

* **🧠 Smart Contextual Renaming:** Automatically infers course titles, section names, exam categories, years, and subject vs. correction roles.
* **📁 Native Local Folder Selection (File System Access API):** Select any directory anywhere on your computer (e.g. `~/Documents/University/Algorithms`), and stream files directly into it.
* **🛡️ Chromium Popup Auto-Dismiss Fix:** Seamlessly transitions into a dedicated browser tab when picking folders, preventing the browser from prematurely closing the interface when the native OS file chooser appears.
* **✏️ In-Place Inline Renaming:** Every suggested filename can be edited directly inside the list before downloading.
* **🔍 Instant Search & Selective Download:** Select/deselect all with one click, or filter files in real time (e.g. `2015`, `Exam`, `Correction`).
* **🔐 Zero-Credential Session Handling:** Runs within your authenticated Moodle tab context, inheriting session cookies automatically—no passwords or API tokens required.
* **⚡ Live Progress Tracking:** Visual status badges per file (`Ready`, `Downloading...`, `✓ Saved`, `✗ Error`) and an overall progress bar.

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
5. The **Moodle Smart Downloader** icon will appear in your extensions toolbar. Pin it for quick access!

---

## 🛠️ Usage Walkthrough

1. Navigate to your logged-in Moodle course page and open any section containing documents.
2. Click the extension icon in your browser toolbar.
3. Review the detected course title, active section, and parsed files.
4. Customize selections or edit filenames if desired.
5. Click **"Choose Folder & Download"**:
   * Pick your destination folder in your native OS directory picker.
   * Watch files download with real-time status and progress indicators!

---

## 📂 Project Architecture

```
moodleScrape/
├── manifest.json            # Manifest V3 extension configuration
├── icons/                   # High-res extension icons (16, 32, 48, 128px)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── scraper.js           # Core DOM extraction and smart renaming logic
│   ├── content.js           # Content script injected into Moodle pages
│   └── background.js        # Background service worker (downloads fallback)
├── popup/
│   ├── popup.html           # Modern user interface
│   ├── popup.css            # Responsive styles and typography
│   └── popup.js             # UI controller & File System Access handler
├── test/
│   ├── test_scraper.js      # Unit tests based on real Moodle course layouts
│   └── test_other_formats.js# Unit tests for standard Moodle activities
└── README.md
```

---

## 🧪 Running Automated Tests

Run the test suite using Node.js:
```bash
node test/test_scraper.js
node test/test_other_formats.js
```

---

## 📄 License

MIT License. Feel free to use, modify, and distribute.
