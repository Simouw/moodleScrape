/**
 * scraper.js - Intelligent Moodle Document Extractor
 * Parses active DOM to detect files, resources, and generates
 * meaningful, structured filenames based on contextual semantics.
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

  // Clean raw node text
  function cleanText(text) {
    if (!text) return '';
    return text.replace(/[\s\u00A0]+/g, ' ').replace(/[:\s]+$/, '').trim();
  }

  // Detect file extension
  function detectExtension(url, text) {
    const match = url.match(/\.([a-zA-Z0-9]{2,5})(?:[?#]|$)/i);
    if (match) {
      const ext = match[1].toLowerCase();
      if (!['php', 'html', 'htm', 'asp', 'aspx', 'jsp'].includes(ext)) {
        return '.' + ext;
      }
    }

    const lowerText = (text || '').toLowerCase();
    if (lowerText.includes('pdf')) return '.pdf';
    if (lowerText.includes('zip') || lowerText.includes('archive')) return '.zip';
    if (lowerText.includes('docx') || lowerText.includes('word')) return '.docx';
    if (lowerText.includes('xlsx') || lowerText.includes('excel')) return '.xlsx';
    if (lowerText.includes('pptx') || lowerText.includes('powerpoint')) return '.pptx';
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

    // Common Moodle resource endpoints
    if (href.includes('/mod/resource/view.php') ||
        href.includes('/pluginfile.php/') ||
        href.includes('/mod/folder/') ||
        href.includes('/mod/assign/') ||
        href.includes('forcedownload=1')) {
      return true;
    }

    // Direct file extensions
    if (/\.(pdf|zip|tar|gz|tgz|rar|7z|docx?|xlsx?|pptx?|odt|ods|odp|txt|c|cpp|h|py|java|sh|csv|ipynb)(?:[?#]|$)/i.test(href)) {
      return true;
    }

    // Text indicating a document
    const text = anchor.textContent || '';
    if (/\b(fichier|document|télécharger|download|pdf|file)\b/i.test(text)) {
      if (!href.includes('/user/') && !href.includes('/course/view.php') && !href.includes('/login/')) {
        return true;
      }
    }

    // Presence of file icon
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

  // Extract active section or tab
  function getActiveSection(doc) {
    const activeTab = doc.querySelector(
      '.nav-tabs .active, .nav-pills .active, .tabtree .active, .onetopic .nav-link.active, button.btn.active, .section.active h3'
    );
    if (activeTab && activeTab.textContent.trim()) {
      return cleanText(activeTab.textContent);
    }

    const currentSection = doc.querySelector('.course-content .section.current .sectionname, .course-content .section .sectionname');
    if (currentSection && currentSection.textContent.trim()) {
      return cleanText(currentSection.textContent);
    }

    const breadcrumbLast = doc.querySelector('.breadcrumb-item:last-child span, .breadcrumb-item:last-child a');
    if (breadcrumbLast && breadcrumbLast.textContent.trim()) {
      return cleanText(breadcrumbLast.textContent);
    }

    return '';
  }

  // Get ancestor list context (e.g. "Année 2005-2006" or "Year 2020-2021")
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
        directText = directText.replace(/[:\s]+$/, '');
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
    prevText = cleanText(prevText);

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
    const prevLower = prevText.toLowerCase();

    if (/\b(correction|corrigé|corriges?|solution|solutions|answers?|reponses?|réponses?)\b/i.test(prevLower)) {
      role = 'Correction';
    } else if (/\b(sujet|énoncé|enonce|subject|problem|statement)\b/i.test(prevLower)) {
      role = 'Subject';
    } else if (isMultiLinkContainer && containerHasCorrection) {
      role = 'Subject';
    } else {
      if (/^\s*\(\s*(correction|corrigé|solution)\s*\)/i.test(nextText)) {
        role = 'Correction';
      }
    }

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

    return {
      prevText,
      nextText,
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

  // Main extraction function
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

      // 1. Check for standard Moodle activity instance with explicit title
      const activityName = getMoodleActivityName(anchor);
      const isActivityGeneric = !activityName || /^(fichier\s*pdf|pdf|document|file|download|télécharger|lien)$/i.test(activityName);

      if (activityName && !isActivityGeneric) {
        parts.push(sanitizeFilename(activityName));
        contextPath = activityName;
      } else {
        // 2. Hierarchical list context
        const ancestors = getAncestorListContext(anchor);
        ancestors.forEach(a => parts.push(sanitizeFilename(a)));

        const lineCtx = analyzeLineContext(anchor);
        if (lineCtx.itemType) {
          parts.push(sanitizeFilename(lineCtx.itemType));
        }
        if (lineCtx.role) {
          parts.push(sanitizeFilename(lineCtx.role));
        }

        contextPath = ancestors.join(' > ') + (lineCtx.itemType ? ` > ${lineCtx.itemType}` : '') + (lineCtx.role ? ` (${lineCtx.role})` : '');
      }

      // 3. Fallback to anchor text
      if (parts.length === 0) {
        const isGeneric = /^(fichier\s*pdf|pdf|document|file|download|télécharger|lien|here|link)$/i.test(anchorRawText);
        if (anchorRawText && !isGeneric) {
          parts.push(sanitizeFilename(anchorRawText));
        }
      }

      // 4. Fallback to URL path segment
      if (parts.length === 0) {
        try {
          const pathname = new URL(href, doc.baseURI).pathname;
          const segments = pathname.split('/').filter(Boolean);
          const lastSeg = segments[segments.length - 1] || '';
          if (lastSeg && !lastSeg.includes('.php')) {
            const cleanSeg = decodeURIComponent(lastSeg).replace(/\.[a-zA-Z0-9]+$/, '');
            parts.push(sanitizeFilename(cleanSeg));
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

      // Handle duplicate filenames
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

  return {
    extractDocuments,
    sanitizeFilename,
    detectExtension
  };
});
