# Moodle Smart Downloader

Browser extension for bulk downloading and context-aware renaming of documents on Moodle.

## Features

- **In-Page Drawer:** Toggles directly on the active Moodle tab. No new browser tab required.
- **Dedicated Tab View:** An "Expand to New Tab" button in the header opens a full-screen view.
- **Multi-Level Section Detection:** Accurately extracts section and sub-topic hierarchy across tabs, sub-tabs, and breadcrumbs (e.g. `Travaux pratiques / TP5`, `Cours / LaTeX et Git/GitLab`, `Travaux dirigés`).
- **Sub-Page Crawling:** Discovers and fetches embedded documents inside linked Moodle activity sub-pages (such as `/mod/page/` or `/mod/folder/`, e.g. `GCC-DDD`), prefixing downloaded files with the sub-page title.
- **Contextual Renaming:** Replaces generic labels (such as "Fichier PDF") with structured filenames based on ancestor headers, academic years, and roles (Subject vs. Correction).
- **Local Directory Selection:** Uses the File System Access API (`showDirectoryPicker`) to write files directly to any selected folder on the filesystem.
- **Session Handling:** Relies on active session cookies via authenticated fetch calls (`credentials: 'include'`).
- **Inline Editing & Search:** Edit suggested filenames in place and filter files by keyword before downloading.

## Installation

### Chrome / Brave / Edge / Chromium

1. Open `chrome://extensions/` (or `edge://extensions/`).
2. Enable **Developer Mode** in the top-right corner.
3. Click **Load unpacked** and select the project directory:
   ```bash
   /home/cmo/code/moodleScrape
   ```
4. Pin the extension to your toolbar.

## Usage

1. Open a Moodle course section where you are logged in.
2. Click the extension icon in the toolbar to open the in-page drawer.
3. Adjust file selections or edit filenames directly if needed.
4. Click **Choose Folder & Download** to select the destination folder and save the files.

## Project Structure

```
moodleScrape/
├── manifest.json            # Manifest V3 extension configuration
├── icons/                   # Extension icons (16, 32, 48, 128px)
├── src/
│   ├── scraper.js           # DOM parser, hierarchy resolver, and sub-page crawler
│   ├── content.js           # In-page drawer component (Shadow DOM)
│   └── background.js        # Action click and download fallback handlers
├── popup/
│   ├── popup.html           # Full-page dedicated tab interface
│   ├── popup.css            # Styles
│   └── popup.js             # Controller for dedicated tab view
├── test/
│   ├── test_scraper.js      # Unit tests for exam archives
│   ├── test_other_formats.js# Unit tests for standard resources
│   └── test_hierarchy.js    # Unit tests for multi-level tabs and sub-pages
└── README.md
```

## Testing

Run unit tests using Node.js:

```bash
node test/test_scraper.js
node test/test_other_formats.js
node test/test_hierarchy.js
```

## License

MIT
