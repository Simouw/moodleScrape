/**
 * scraper.js - Intelligent Moodle Document Extractor & Sub-Page Crawler
 * Parses DOM hierarchy, active multi-level sections/tabs, and crawls linked
 * sub-pages (e.g. GCC-DDD) to discover embedded files.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MoodleScraper = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Sanitize filename to comply with OS filesystem rules
  function sanitizeFilename(name) {
    if (!name) return '';
    let clean = name.replace(/[\\/*?:"<>|]/g, '_');
    clean = clean.replace(/[\s\u00A0]+/g, ' ').trim();
    clean = clean.replace(/_+/g, '_').replace(/( - )+/g, ' - ');
    return clean;
  }

  // Strip extension safely (handling compound extensions like .tar.gz)
  function stripExtension(filename) {
    if (!filename) return '';
    return filename.replace(/(\.tar\.(gz|bz2|xz)|\.[a-zA-Z0-9]{2,5})$/i, '');
  }

  // Clean raw node text and strip navigation/dropdown glyphs
  function cleanText(text) {
    if (!text) return '';
    let t = text.replace(/[\s\u00A0]+/g, ' ').replace(/[:\s]+$/, '').trim();
    t = t.replace(/^[v▼▾►▸◄\s|]+/, '').replace(/[v▼▾►▸◄\s|]+$/, '').trim();
    return t;
  }

  // Detect file extension (including compound extensions like .tar.gz)
  function detectExtension(url, text) {
    const rawUrl = url || '';
    const lowerUrl = rawUrl.toLowerCase();
    const lowerText = (text || '').toLowerCase();

    if (lowerUrl.includes('.tar.gz') || lowerText.includes('.tar.gz')) return '.tar.gz';
    if (lowerUrl.includes('.tar.bz2') || lowerText.includes('.tar.bz2')) return '.tar.bz2';
    if (lowerUrl.includes('.tar.xz') || lowerText.includes('.tar.xz')) return '.tar.xz';

    const match = rawUrl.match(/\.([a-zA-Z0-9]{2,5})(?:[?#]|$)/i);
    if (match) {
      const ext = match[1].toLowerCase();
      if (!['php', 'html', 'htm', 'asp', 'aspx', 'jsp'].includes(ext)) {
        return '.' + ext;
      }
    }

    if (lowerText.includes('pdf')) return '.pdf';
    if (lowerText.includes('zip') || lowerText.includes('archive')) return '.zip';
    if (lowerText.includes('docx') || lowerText.includes('word')) return '.docx';
    if (lowerText.includes('xlsx') || lowerText.includes('excel')) return '.xlsx';
    if (lowerText.includes('pptx') || lowerText.includes('powerpoint')) return '.pptx';
    if (lowerText.includes('.tar')) return '.tar';
    if (lowerText.includes('c source') || lowerText.includes('.c')) return '.c';
    if (lowerText.includes('header') || lowerText.includes('.h')) return '.h';
    if (lowerText.includes('python') || lowerText.includes('.py')) return '.py';

    return '.pdf';
  }

  // Check if link represents a downloadable document/resource
  function isDownloadableResource(anchor) {
    const href = anchor.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
      return false;
    }

    if (href.includes('/mod/resource/view.php') ||
        href.includes('/pluginfile.php/') ||
        href.includes('forcedownload=1')) {
      return true;
    }

    if (/\.(pdf|zip|tar(\.gz|\.bz2|\.xz)?|tgz|rar|7z|docx?|xlsx?|pptx?|odt|ods|odp|txt|c|cpp|h|py|java|sh|csv|ipynb)(?:[?#]|$)/i.test(href)) {
      return true;
    }

    const text = anchor.textContent || '';
    if (/\b(fichier|document|télécharger|download|pdf|file)\b/i.test(text)) {
      if (!href.includes('/user/') && !href.includes('/course/view.php') && !href.includes('/login/') && !href.includes('/mod/page/')) {
        return true;
      }
    }

    const icon = anchor.querySelector('img[src*="pdf"], img[alt*="PDF"], img[alt*="Fichier"], .fa-file-pdf, .fa-file-archive, .fa-file');
    if (icon) {
      return true;
    }

    return false;
  }

  // Extract course title from header or breadcrumbs
  function getCourseTitle(doc) {
    const selectors = [
      '#page-header h1',
      '.page-header-headings h1',
      'header h1',
      '.breadcrumb-item:nth-last-child(2) a',
      '.breadcrumb-item:first-child a',
      'title'
    ];

    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el && el.textContent.trim()) {
        let title = el.textContent.trim();
        title = title.replace(/^(Cours|Course)\s*:\s*/i, '');
        title = title.split('|')[0].trim();
        if (title) return cleanText(title);
      }
    }
    return 'Moodle_Course';
  }

  // Multi-level Section Hierarchy (e.g. "Cours / LaTeX et Git/GitLab" or "Travaux pratiques / TP5" or "Travaux dirigés")
  function getActiveSection(doc) {
    const sections = [];

    // 1. Inspect onetopic / tabs rows
    const tabContainers = Array.from(doc.querySelectorAll('.nav-tabs, .onetopic-tabs, .tabtree, .nav-pills'));
    tabContainers.forEach(container => {
      const activeEl = container.querySelector('.nav-link.active, .active > a, .active > span, .active');
      if (activeEl) {
        let text = cleanText(activeEl.textContent);
        if (text && !sections.some(s => s.toLowerCase() === text.toLowerCase())) {
          sections.push(text);
        }
      }
    });

    // 2. Inspect Breadcrumb items
    const breadcrumbItems = Array.from(doc.querySelectorAll('.breadcrumb .breadcrumb-item, nav[aria-label*="Fil"] li, nav[aria-label*="Breadcrumb"] li'));
    const breadcrumbTexts = breadcrumbItems.map(el => cleanText(el.textContent)).filter(Boolean);
    const lastBreadcrumb = breadcrumbTexts.length > 0 ? breadcrumbTexts[breadcrumbTexts.length - 1] : '';

    if (lastBreadcrumb) {
      const courseTitle = getCourseTitle(doc);
      const isNotCourse = lastBreadcrumb.toLowerCase() !== courseTitle.toLowerCase();
      const isNotCategory = !/^(iti|accueil|home|courses?|mes cours)$/i.test(lastBreadcrumb);

      if (isNotCourse && isNotCategory) {
        const alreadyPresent = sections.some(s => s.toLowerCase() === lastBreadcrumb.toLowerCase());
        if (!alreadyPresent) {
          sections.push(lastBreadcrumb);
        }
      }
    }

    // 3. Fallback to active section in course content if empty
    if (sections.length === 0) {
      const currentSection = doc.querySelector('.course-content .section.current .sectionname, .course-content .section .sectionname');
      if (currentSection && currentSection.textContent.trim()) {
        sections.push(cleanText(currentSection.textContent));
      }
    }

    return sections.length > 0 ? sections.join(' / ') : '';
  }

  // Find sub-pages (e.g. GCC-DDD) linked from the current section
  function findSubPageLinks(doc) {
    const mainContent = doc.querySelector('#region-main, .course-content, #content') || doc.body;
    const links = Array.from(mainContent.querySelectorAll('a[href]'));
    const subPages = [];
    const seenUrls = new Set();

    links.forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      const isPage = href.includes('/mod/page/view.php');
      const isFolder = href.includes('/mod/folder/view.php');
      const isAssign = href.includes('/mod/assign/view.php');

      const activityContainer = a.closest('.activity, .activityinstance');
      const hasPageClass = activityContainer && (
        activityContainer.classList.contains('page') ||
        activityContainer.classList.contains('modtype_page') ||
        activityContainer.classList.contains('folder') ||
        activityContainer.classList.contains('modtype_folder')
      );

      if ((isPage || isFolder || isAssign || hasPageClass) && !seenUrls.has(href)) {
        if (a.closest('.section-navigation, .mdl-align, .onetopic_pager, .course-pager')) {
          return;
        }

        seenUrls.add(href);

        let title = '';
        if (activityContainer) {
          const inst = activityContainer.querySelector('.instancename');
          if (inst) {
            const clone = inst.cloneNode(true);
            clone.querySelectorAll('.accesshide').forEach(el => el.remove());
            title = cleanText(clone.textContent);
          }
        }
        if (!title) {
          title = cleanText(a.textContent);
        }
        title = title.replace(/^(Page|Dossier|Folder)\s*:\s*/i, '').trim();

        if (title && title.length > 1) {
          subPages.push({
            title: sanitizeFilename(title),
            url: a.href || href
          });
        }
      }
    });

    return subPages;
  }

  // Get ancestor list context
  function getAncestorListContext(anchor) {
    const ancestors = [];
    let parentLi = anchor.closest('li');
    if (!parentLi) return ancestors;

    let current = parentLi.parentElement ? parentLi.parentElement.closest('li') : null;
    while (current) {
      let directText = '';
      for (const node of current.childNodes) {
        if (node.nodeType === 3) {
          directText += ' ' + node.textContent;
        } else if (node.nodeType === 1 && !['UL', 'OL'].includes(node.tagName)) {
          if (['STRONG', 'B', 'SPAN', 'EM', 'H4', 'H5'].includes(node.tagName)) {
            directText += ' ' + node.textContent;
          }
        }
      }

      directText = cleanText(directText);
      if (directText) {
        ancestors.unshift(directText);
      }

      current = current.parentElement ? current.parentElement.closest('li') : null;
    }

    return ancestors;
  }

  // Analyze line context around the anchor
  function analyzeLineContext(anchor) {
    let prevText = '';
    let node = anchor.previousSibling;
    while (node) {
      if (node.nodeType === 3) {
        prevText = node.textContent + ' ' + prevText;
      } else if (node.nodeType === 1) {
        if (node.tagName === 'A') break;
        prevText = (node.textContent || '') + ' ' + prevText;
      }
      node = node.previousSibling;
    }
    prevText = cleanText(prevText).replace(/^[,;\s]+/, '').replace(/[:,\s]+$/, '').trim();

    let nextText = '';
    node = anchor.nextSibling;
    while (node) {
      if (node.nodeType === 3) {
        nextText += ' ' + node.textContent;
      } else if (node.nodeType === 1) {
        if (node.tagName === 'A') break;
        nextText += ' ' + node.textContent;
      }
      node = node.nextSibling;
    }
    nextText = cleanText(nextText);

    const container = anchor.closest('li, tr, p, .activityinstance, .activity');
    let containerFullText = '';
    let isMultiLinkContainer = false;
    let containerHasCorrection = false;

    if (container) {
      containerFullText = cleanText(container.textContent);
      const linksInContainer = container.querySelectorAll('a[href]');
      if (linksInContainer.length > 1) {
        isMultiLinkContainer = true;
      }
      containerHasCorrection = /\b(correction|corrigé|corriges?|solution|solutions)\b/i.test(containerFullText);
    }

    let role = '';
    let itemLabel = '';
    const prevLower = prevText.toLowerCase();

    if (/\b(correction|corrigé|corriges?|solution|solutions|answers?|reponses?|réponses?)\b/i.test(prevLower)) {
      role = 'Correction';
    } else if (isMultiLinkContainer && containerHasCorrection) {
      role = 'Subject';
    }

    // Extract item type
    let itemType = '';
    const typeRegex = /\b(Partiel|Examen|Exam|Midterm|Final|Rattrapage|Session\s*\d+|TP\s*\d*|TD\s*\d*|Lab\s*\d*|Homework|Assignment|Devoir|Projet|Project|Quiz)\b/i;

    let match = prevText.match(typeRegex);
    if (match) {
      itemType = match[1];
    } else if (containerFullText) {
      match = containerFullText.match(typeRegex);
      if (match) {
        itemType = match[1];
      }
    }

    // If prevText is not just a role keyword, it is a descriptive label (e.g. "Sujet détaillé", "Jeu du snake")
    if (prevText && !/\b(correction|corrigé|solution)\b/i.test(prevText)) {
      itemLabel = prevText;
    }

    return {
      prevText,
      nextText,
      itemLabel,
      itemType,
      role
    };
  }

  // Get name for standard Moodle activity instance
  function getMoodleActivityName(anchor) {
    const activity = anchor.closest('.activity, .activityinstance');
    if (!activity) return null;

    const instanceName = activity.querySelector('.instancename');
    if (instanceName) {
      const clone = instanceName.cloneNode(true);
      const accessHide = clone.querySelectorAll('.accesshide');
      accessHide.forEach(el => el.remove());
      return cleanText(clone.textContent);
    }
    return null;
  }

  // Extract documents from a given document object
  function extractDocuments(doc) {
    const courseTitle = getCourseTitle(doc);
    const activeSection = getActiveSection(doc);

    const mainContent = doc.querySelector('#region-main, .course-content, #content') || doc.body;
    const allAnchors = Array.from(mainContent.querySelectorAll('a[href]'));

    const items = [];
    const usedFilenames = new Map();

    allAnchors.forEach((anchor, index) => {
      if (!isDownloadableResource(anchor)) {
        return;
      }

      const href = anchor.href || anchor.getAttribute('href');
      const anchorRawText = cleanText(anchor.textContent);
      const ext = detectExtension(href, anchorRawText);

      const parts = [];
      let contextPath = '';

      // 1. Standard Moodle activity instance with explicit title
      const activityName = getMoodleActivityName(anchor);
      const isActivityGeneric = !activityName || /^(fichier\s*pdf|pdf|document|file|download|télécharger|lien)$/i.test(activityName);

      if (activityName && !isActivityGeneric) {
        parts.push(sanitizeFilename(stripExtension(activityName)));
        contextPath = activityName;
      } else {
        // 2. Hierarchical list context
        const ancestors = getAncestorListContext(anchor);
        ancestors.forEach(a => parts.push(sanitizeFilename(a)));

        const lineCtx = analyzeLineContext(anchor);

        // If a descriptive line label exists (e.g. "Sujet détaillé" or "Jeu du snake"), use it
        if (lineCtx.itemLabel) {
          parts.push(sanitizeFilename(lineCtx.itemLabel));
        } else if (lineCtx.itemType) {
          parts.push(sanitizeFilename(lineCtx.itemType));
        }

        if (lineCtx.role) {
          // If label already conveys the role or subject, avoid redundancy
          if (!lineCtx.itemLabel || (!lineCtx.itemLabel.toLowerCase().includes(lineCtx.role.toLowerCase()) && lineCtx.itemType)) {
            parts.push(sanitizeFilename(lineCtx.role));
          }
        }

        contextPath = ancestors.join(' > ') + (lineCtx.itemLabel || lineCtx.itemType ? ` > ${lineCtx.itemLabel || lineCtx.itemType}` : '') + (lineCtx.role ? ` (${lineCtx.role})` : '');
      }

      // 3. Fallback to anchor text
      if (parts.length === 0) {
        const isGeneric = /^(fichier\s*pdf|pdf|document|file|download|télécharger|lien|here|link)$/i.test(anchorRawText);
        if (anchorRawText && !isGeneric) {
          parts.push(sanitizeFilename(stripExtension(anchorRawText)));
        }
      }

      // 4. Fallback to URL path segment
      if (parts.length === 0) {
        try {
          const pathname = new URL(href, doc.baseURI || 'https://moodle.example.com').pathname;
          const segments = pathname.split('/').filter(Boolean);
          const lastSeg = segments[segments.length - 1] || '';
          if (lastSeg && !lastSeg.includes('.php')) {
            const cleanSeg = decodeURIComponent(lastSeg);
            parts.push(sanitizeFilename(stripExtension(cleanSeg)));
          }
        } catch (e) {
          // ignore url error
        }
      }

      // 5. Ultimate fallback
      if (parts.length === 0) {
        parts.push(`Document_${index + 1}`);
      }

      let baseName = parts.join(' - ');
      baseName = sanitizeFilename(baseName);
      if (!baseName) baseName = `Document_${index + 1}`;

      let finalFilename = baseName + ext;

      if (usedFilenames.has(finalFilename)) {
        const count = usedFilenames.get(finalFilename) + 1;
        usedFilenames.set(finalFilename, count);
        finalFilename = `${baseName} (${count})${ext}`;
      } else {
        usedFilenames.set(finalFilename, 1);
      }

      items.push({
        id: `moodle_doc_${index}`,
        url: href,
        filename: finalFilename,
        defaultFilename: finalFilename,
        extension: ext,
        originalText: anchorRawText || 'Link',
        contextPath: contextPath || baseName,
        selected: true
      });
    });

    return {
      courseTitle,
      activeSection,
      totalFound: items.length,
      items
    };
  }

  // Main extraction including asynchronous sub-pages crawling (GCC-DDD, etc.)
  async function extractAllDocuments(doc, fetchHtmlFn) {
    const directResults = extractDocuments(doc);
    const allItems = [...directResults.items];
    const usedFilenames = new Map();
    allItems.forEach(i => usedFilenames.set(i.filename, 1));

    const subPages = findSubPageLinks(doc);

    if (fetchHtmlFn && subPages.length > 0) {
      for (const sp of subPages) {
        try {
          const html = await fetchHtmlFn(sp.url);
          if (!html) continue;

          let subDoc;
          if (typeof DOMParser !== 'undefined') {
            subDoc = new DOMParser().parseFromString(html, 'text/html');
          } else {
            const { JSDOM } = require('jsdom');
            subDoc = new JSDOM(html).window.document;
          }

          const subResults = extractDocuments(subDoc);
          subResults.items.forEach(subItem => {
            const cleanSubName = stripExtension(subItem.filename);
            const prefixedName = sanitizeFilename(`${sp.title} - ${cleanSubName}`) + subItem.extension;

            let finalName = prefixedName;
            if (usedFilenames.has(finalName)) {
              const count = usedFilenames.get(finalName) + 1;
              usedFilenames.set(finalName, count);
              finalName = `${stripExtension(prefixedName)} (${count})${subItem.extension}`;
            } else {
              usedFilenames.set(finalName, 1);
            }

            allItems.push({
              id: `sub_${subItem.id}_${allItems.length}`,
              url: subItem.url,
              filename: finalName,
              defaultFilename: finalName,
              extension: subItem.extension,
              originalText: subItem.originalText,
              contextPath: `${directResults.activeSection || 'Section'} > ${sp.title} > ${subItem.contextPath}`,
              selected: true,
              fromSubPage: sp.title
            });
          });
        } catch (e) {
          console.warn(`Could not crawl sub-page ${sp.title}:`, e);
        }
      }
    }

    return {
      courseTitle: directResults.courseTitle,
      activeSection: directResults.activeSection,
      totalFound: allItems.length,
      items: allItems,
      subPagesFound: subPages.map(s => s.title)
    };
  }

  return {
    extractDocuments,
    extractAllDocuments,
    findSubPageLinks,
    getActiveSection,
    getCourseTitle,
    sanitizeFilename,
    stripExtension,
    detectExtension
  };
});
