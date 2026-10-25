/**
 * PDFSuite - All Tools Dropdown Mega-Menu & Universal Tool Finder
 * Copyright (c) 2025 Eebii. All Rights Reserved.
 */

(function () {
  'use strict';

  // --- Determine Path Prefix ---
  const isInsidePublic = window.location.pathname.includes('/public/') || 
                         window.location.pathname.endsWith('/editor.html') ||
                         window.location.pathname.endsWith('/merge.html') ||
                         window.location.pathname.endsWith('/compress.html');
  const publicPrefix = isInsidePublic ? './' : './public/';
  const rootPrefix = isInsidePublic ? '../' : './';

  // --- Tools Registry ---
  const TOOLS = [
    // Category 1: Edit & Annotate
    {
      id: 'editor',
      name: 'Edit PDF',
      desc: 'Add text, shapes, whiteout & annotations',
      icon: 'edit-3',
      category: 'edit',
      categoryLabel: 'Edit & Sign',
      url: publicPrefix + 'editor.html',
      badge: '',
      keywords: 'edit write text draw shape modify stamp update annotate'
    },
    {
      id: 'fill-sign',
      name: 'Fill & Sign',
      desc: 'Draw, type, or upload e-signatures',
      icon: 'pen-tool',
      category: 'edit',
      categoryLabel: 'Edit & Sign',
      url: publicPrefix + 'editor.html',
      badge: 'Popular',
      keywords: 'signature sign contract fill form drawing type signature'
    },
    {
      id: 'watermark',
      name: 'Watermark PDF',
      desc: 'Add confidential stamps & logos',
      icon: 'droplet',
      category: 'edit',
      categoryLabel: 'Edit & Sign',
      url: publicPrefix + 'watermark.html',
      badge: '',
      keywords: 'watermark stamp brand draft confidential logo'
    },
    {
      id: 'redact',
      name: 'Redact & Blackout',
      desc: 'Permanently remove sensitive data',
      icon: 'eye-off',
      category: 'edit',
      categoryLabel: 'Edit & Sign',
      url: publicPrefix + 'redact.html',
      badge: '',
      keywords: 'redact blackout censor hide erase private confidential'
    },

    // Category 2: Organize & Pages
    {
      id: 'merge',
      name: 'Merge PDF',
      desc: 'Combine multiple PDFs into one document',
      icon: 'layers',
      category: 'organize',
      categoryLabel: 'Organize Pages',
      url: publicPrefix + 'merge.html',
      badge: 'Popular',
      keywords: 'merge combine join stitch stitcher binder multiple'
    },
    {
      id: 'split',
      name: 'Split PDF',
      desc: 'Extract pages or separate into multiple files',
      icon: 'scissors',
      category: 'organize',
      categoryLabel: 'Organize Pages',
      url: publicPrefix + 'split.html',
      badge: '',
      keywords: 'split extract separate divide cut break'
    },
    {
      id: 'remove-pages',
      name: 'Remove Pages',
      desc: 'Delete unwanted pages from your document',
      icon: 'trash-2',
      category: 'organize',
      categoryLabel: 'Organize Pages',
      url: publicPrefix + 'remove-pages.html',
      badge: '',
      keywords: 'remove delete cut pages unwanted erase'
    },
    {
      id: 'reorder',
      name: 'Organize PDF',
      desc: 'Reorder, rotate, delete & extract pages',
      icon: 'layout-grid',
      category: 'organize',
      categoryLabel: 'Organize Pages',
      url: publicPrefix + 'reorder.html',
      badge: 'Power Tool',
      keywords: 'organize rotate reorder sort arrange flip delete extract split'
    },
    {
      id: 'page-number',
      name: 'Page Numbers',
      desc: 'Add numbers, headers & footers to pages',
      icon: 'hash',
      category: 'organize',
      categoryLabel: 'Organize Pages',
      url: publicPrefix + 'page-number.html',
      badge: 'New',
      keywords: 'page number header footer pagination numbering bates stamp'
    },

    // Category 3: Convert (Both to and from PDF)
    {
      id: 'pdf-to-word',
      name: 'PDF to Word',
      desc: 'Convert PDF to genuine .docx Word document',
      icon: 'file-text',
      category: 'convert',
      categoryLabel: 'Convert',
      url: publicPrefix + 'pdf-to-word.html',
      badge: 'Real .DOCX',
      keywords: 'pdf to word doc docx convert editable microsoft openxml'
    },
    {
      id: 'word-to-pdf',
      name: 'Word to PDF',
      desc: 'Turn Word documents into secure PDFs',
      icon: 'file-input',
      category: 'convert',
      categoryLabel: 'Convert',
      url: publicPrefix + 'word-to-pdf.html',
      badge: '',
      keywords: 'word doc docx to pdf convert document'
    },
    {
      id: 'pdf-to-excel',
      name: 'PDF to Excel',
      desc: 'Extract tables into XLSX spreadsheets',
      icon: 'table',
      category: 'convert',
      categoryLabel: 'Convert',
      url: publicPrefix + 'pdf-to-excel.html',
      badge: '',
      keywords: 'pdf to excel xls xlsx spreadsheet tables data sheet'
    },
    {
      id: 'excel-to-pdf',
      name: 'Excel to PDF',
      desc: 'Convert spreadsheets into crisp PDFs',
      icon: 'file-spreadsheet',
      category: 'convert',
      categoryLabel: 'Convert',
      url: publicPrefix + 'excel-to-pdf.html',
      badge: '',
      keywords: 'excel xls xlsx spreadsheet to pdf'
    },
    {
      id: 'pdf-to-jpg',
      name: 'PDF to JPG',
      desc: 'Save PDF pages as high-res images',
      icon: 'image',
      category: 'convert',
      categoryLabel: 'Convert',
      url: publicPrefix + 'pdf-to-jpg.html',
      badge: '',
      keywords: 'pdf to jpg jpeg png image picture extract photo'
    },
    {
      id: 'jpg-to-pdf',
      name: 'JPG to PDF',
      desc: 'Combine pictures into a single PDF',
      icon: 'file-image',
      category: 'convert',
      categoryLabel: 'Convert',
      url: publicPrefix + 'jpg-to-pdf.html',
      badge: '',
      keywords: 'jpg jpeg png image to pdf photos compile'
    },
    {
      id: 'pdf-to-ppt',
      name: 'PDF to PPT',
      desc: 'Generate Microsoft PowerPoint (.pptx) slides',
      icon: 'monitor-play',
      category: 'convert',
      categoryLabel: 'Convert',
      url: publicPrefix + 'pdf-to-ppt.html',
      badge: 'Real .PPTX',
      keywords: 'pdf to ppt pptx presentation slides powerpoint'
    },
    {
      id: 'scan-to-pdf',
      name: 'Scan to PDF',
      desc: 'Capture camera photos directly to PDF',
      icon: 'scan',
      category: 'convert',
      categoryLabel: 'Convert',
      url: publicPrefix + 'scan-to-pdf.html',
      badge: '',
      keywords: 'scan camera mobile photo snap to pdf document'
    },

    // Category 4: Security & AI
    {
      id: 'ocr',
      name: 'OCR Recognition',
      desc: 'Extract text from scanned PDFs & images',
      icon: 'search',
      category: 'security-ai',
      categoryLabel: 'Security & AI',
      url: publicPrefix + 'ocr.html',
      badge: 'AI',
      keywords: 'ocr optical character recognition text extract scan tesseract'
    },
    {
      id: 'ai-summarizer',
      name: 'AI Summarizer',
      desc: 'Chat with your PDF & get instant summaries',
      icon: 'bot',
      category: 'security-ai',
      categoryLabel: 'Security & AI',
      url: publicPrefix + 'ai-summarizer.html',
      badge: 'AI',
      keywords: 'ai chat bot summarizer summarize gpt gemini read document'
    },
    {
      id: 'compress',
      name: 'Compress PDF',
      desc: 'Shrink file size without losing clarity',
      icon: 'minimize-2',
      category: 'security-ai',
      categoryLabel: 'Security & AI',
      url: publicPrefix + 'compress.html',
      badge: 'Essential',
      keywords: 'compress reduce size shrink optimize lightweight small'
    },
    {
      id: 'protect',
      name: 'Protect PDF',
      desc: 'Encrypt with password and restrict editing',
      icon: 'lock',
      category: 'security-ai',
      categoryLabel: 'Security & AI',
      url: publicPrefix + 'protect.html',
      badge: '',
      keywords: 'protect password encrypt secure lock privacy restriction'
    },
    {
      id: 'flatten',
      name: 'Flatten PDF',
      desc: 'Lock form fields, signatures & annotations',
      icon: 'shield-check',
      category: 'security-ai',
      categoryLabel: 'Security & AI',
      url: publicPrefix + 'flatten.html',
      badge: 'New',
      keywords: 'flatten lock bake form fields comments annotations immutable'
    },

    // Category 5: Image Tools
    {
      id: 'img-compress',
      name: 'Compress Image',
      desc: 'Reduce JPG, PNG & WebP file size',
      icon: 'minimize',
      category: 'images',
      categoryLabel: 'Image Tools',
      url: publicPrefix + 'img-compress.html',
      badge: '',
      keywords: 'image photo picture compress shrink jpg png webp'
    },
    {
      id: 'img-resize',
      name: 'Resize Image',
      desc: 'Change dimensions by pixels or percent',
      icon: 'maximize-2',
      category: 'images',
      categoryLabel: 'Image Tools',
      url: publicPrefix + 'img-resize.html',
      badge: '',
      keywords: 'resize dimension scale width height image photo'
    },
    {
      id: 'img-crop',
      name: 'Crop Image',
      desc: 'Trim and cut photos with aspect presets',
      icon: 'crop',
      category: 'images',
      categoryLabel: 'Image Tools',
      url: publicPrefix + 'img-crop.html',
      badge: '',
      keywords: 'crop cut trim frame image photo aspect ratio'
    },
    {
      id: 'img-jpg-to-png',
      name: 'JPG to PNG',
      desc: 'Convert photo format instantly',
      icon: 'repeat',
      category: 'images',
      categoryLabel: 'Image Tools',
      url: publicPrefix + 'img-jpg-to-png.html',
      badge: '',
      keywords: 'jpg png convert image format transparent'
    },
    {
      id: 'img-qr',
      name: 'QR Code Generator',
      desc: 'Create custom QR codes for links & WiFi',
      icon: 'qr-code',
      category: 'images',
      categoryLabel: 'Image Tools',
      url: publicPrefix + 'img-qr.html',
      badge: 'New',
      keywords: 'qr code barcode generate scanner link wifi'
    },
    {
      id: 'img-watermark',
      name: 'Watermark Image',
      desc: 'Stamp photos with custom text or logos',
      icon: 'stamp',
      category: 'images',
      categoryLabel: 'Image Tools',
      url: publicPrefix + 'img-watermark.html',
      badge: '',
      keywords: 'watermark stamp photo image copyright logo'
    },
    {
      id: 'img-all',
      name: 'All Image Tools',
      desc: 'Explore complete photo & image toolkit',
      icon: 'grid',
      category: 'images',
      categoryLabel: 'Image Tools',
      url: publicPrefix + 'image-tools.html',
      badge: 'Explore',
      keywords: 'all images passport background removal social crop'
    }
  ];

  // Helper: SVG Icons mapping
  const SVG_ICONS = {
    'grid': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    'chevron': '<svg class="btn-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
    'search': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    'close': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    'edit-3': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
    'pen-tool': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>',
    'droplet': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>',
    'eye-off': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
    'layers': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
    'scissors': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>',
    'trash-2': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
    'rotate-cw': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>',
    'file-text': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
    'file-input': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M2 15h10"></path><polyline points="9 18 12 15 9 12"></polyline></svg>',
    'table': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path></svg>',
    'file-spreadsheet': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h8"></path><path d="M8 17h8"></path><path d="M14 13v8"></path></svg>',
    'image': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
    'file-image': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><circle cx="10" cy="12" r="2"></circle><path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 21"></path></svg>',
    'monitor-play': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line><polygon points="10 8 15 11 10 14 10 8"></polygon></svg>',
    'scan': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path></svg>',
    'bot': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>',
    'minimize-2': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    'minimize': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>',
    'maximize-2': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    'lock': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    'crop': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v14a2 2 0 0 0 2 2h14"></path><path d="M18 22V8a2 2 0 0 0-2-2H2"></path></svg>',
    'repeat': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
    'qr-code': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><path d="M3 14h3v3H3z"></path><path d="M7 17h3v3H7z"></path><path d="M7 14h3v3H7z"></path></svg>',
    'stamp': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 22h14"></path><path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77z"></path><path d="M14 13V8.5C14 7.12 12.88 6 11.5 6S9 7.12 9 8.5V13"></path></svg>'
  };

  function getIcon(name) {
    return SVG_ICONS[name] || SVG_ICONS['file-text'];
  }

  // --- Render Mega Menu DOM ---
  let backdropEl = null;
  let menuEl = null;
  let triggerBtn = null;
  let searchInput = null;
  let searchClear = null;
  let noResultsEl = null;
  let allItemElements = [];

  function buildMegaMenu() {
    // Backdrop
    backdropEl = document.createElement('div');
    backdropEl.className = 'tools-mega-backdrop';
    backdropEl.id = 'toolsMegaBackdrop';

    // Menu Container
    menuEl = document.createElement('div');
    menuEl.className = 'tools-mega-menu';
    menuEl.id = 'toolsMegaMenu';
    menuEl.setAttribute('role', 'dialog');
    menuEl.setAttribute('aria-label', 'All Tools Quick Menu');

    // Header with search
    const headerEl = document.createElement('div');
    headerEl.className = 'tools-mega-header';
    headerEl.innerHTML = `
      <div class="tools-mega-search-wrapper">
        <span class="tools-mega-search-icon">${SVG_ICONS['search']}</span>
        <input type="text" class="tools-mega-search-input" id="toolsMegaSearchInput" placeholder="Quick find tool... (e.g. merge, compress, sign, ocr, word)" autocomplete="off" spellcheck="false">
        <button class="tools-mega-search-clear" id="toolsMegaSearchClear" title="Clear search">&times;</button>
      </div>
      <button class="tools-mega-close-btn" id="toolsMegaCloseBtn" title="Close (Esc)">${SVG_ICONS['close']}</button>
    `;

    // Body with 4 columns
    const bodyEl = document.createElement('div');
    bodyEl.className = 'tools-mega-body';
    bodyEl.id = 'toolsMegaBody';

    const columns = [
      { key: 'edit', title: 'Edit & Sign', icon: 'edit-3' },
      { key: 'organize', title: 'Organize Pages', icon: 'layers' },
      { key: 'convert', title: 'Convert', icon: 'file-text' },
      { key: 'security-images', title: 'Security, AI & Images', icon: 'bot' }
    ];

    columns.forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'tools-mega-column';
      colEl.dataset.colKey = col.key;

      const titleEl = document.createElement('div');
      titleEl.className = 'tools-mega-col-title';
      titleEl.innerHTML = `${getIcon(col.icon)} <span>${col.title}</span>`;
      colEl.appendChild(titleEl);

      const matchingTools = TOOLS.filter(t => {
        if (col.key === 'security-images') {
          return t.category === 'security-ai' || t.category === 'images';
        }
        return t.category === col.key;
      });

      matchingTools.forEach(tool => {
        const itemEl = document.createElement('a');
        itemEl.href = tool.url;
        itemEl.className = 'tools-mega-item';
        itemEl.dataset.toolId = tool.id;
        itemEl.dataset.searchKeywords = (tool.name + ' ' + tool.desc + ' ' + tool.keywords).toLowerCase();

        let badgeHtml = '';
        if (tool.badge === 'AI') badgeHtml = `<span class="tools-mega-badge badge-ai-tool">AI</span>`;
        else if (tool.badge === 'New') badgeHtml = `<span class="tools-mega-badge badge-new-tool">New</span>`;
        else if (tool.badge) badgeHtml = `<span class="tools-mega-badge" style="background:rgba(37,99,235,0.15); color:#60a5fa;">${tool.badge}</span>`;

        itemEl.innerHTML = `
          <div class="tools-mega-icon">${getIcon(tool.icon)}</div>
          <div class="tools-mega-info">
            <span class="tools-mega-name">${tool.name} ${badgeHtml}</span>
            <span class="tools-mega-desc">${tool.desc}</span>
          </div>
        `;
        colEl.appendChild(itemEl);
        allItemElements.push(itemEl);
      });

      bodyEl.appendChild(colEl);
    });

    // No Results message
    noResultsEl = document.createElement('div');
    noResultsEl.className = 'tools-mega-no-results';
    noResultsEl.innerHTML = `
      <div style="font-size:2rem; margin-bottom:0.4rem;">🔍</div>
      <strong style="color:var(--fg); font-size:1.05rem;">No matching tools found</strong>
      <p>Try searching for keywords like <em>merge</em>, <em>sign</em>, <em>compress</em>, <em>ocr</em>, or <em>word</em>.</p>
    `;
    bodyEl.appendChild(noResultsEl);

    // Footer
    const footerEl = document.createElement('div');
    footerEl.className = 'tools-mega-footer';
    footerEl.innerHTML = `
      <div class="tools-mega-footer-hint">
        <span>Press <kbd>Esc</kbd> to close</span>
        <span>Press <kbd>/</kbd> or <kbd>Ctrl+K</kbd> to search anytime</span>
      </div>
      <div>
        <a href="${rootPrefix}index.html" style="color:var(--accent); text-decoration:none; font-weight:600;">View All 30+ Tools &rarr;</a>
      </div>
    `;

    menuEl.appendChild(headerEl);
    menuEl.appendChild(bodyEl);
    menuEl.appendChild(footerEl);

    document.body.appendChild(backdropEl);
    document.body.appendChild(menuEl);

    // Elements
    searchInput = headerEl.querySelector('#toolsMegaSearchInput');
    searchClear = headerEl.querySelector('#toolsMegaSearchClear');
    const closeBtn = headerEl.querySelector('#toolsMegaCloseBtn');

    // Event Listeners
    backdropEl.addEventListener('click', closeMegaMenu);
    closeBtn.addEventListener('click', closeMegaMenu);

    searchInput.addEventListener('input', handleMegaSearch);
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      handleMegaSearch();
      searchInput.focus();
    });
  }

  function handleMegaSearch() {
    const q = (searchInput.value || '').trim().toLowerCase();
    searchClear.style.display = q ? 'inline-flex' : 'none';

    let matchCount = 0;
    const bodyEl = document.getElementById('toolsMegaBody');
    const columns = bodyEl ? bodyEl.querySelectorAll('.tools-mega-column') : [];

    allItemElements.forEach(item => {
      const kw = item.dataset.searchKeywords || '';
      const isMatch = !q || kw.includes(q);
      if (isMatch) {
        item.classList.remove('hidden-search');
        matchCount++;
      } else {
        item.classList.add('hidden-search');
      }
    });

    // Hide column header if all items inside are hidden
    columns.forEach(col => {
      const visibleItems = col.querySelectorAll('.tools-mega-item:not(.hidden-search)');
      if (visibleItems.length === 0) {
        col.style.display = 'none';
      } else {
        col.style.display = 'flex';
      }
    });

    if (matchCount === 0) {
      noResultsEl.classList.add('visible');
    } else {
      noResultsEl.classList.remove('visible');
    }
  }

  function openMegaMenu() {
    if (!menuEl) buildMegaMenu();
    backdropEl.classList.add('open');
    menuEl.classList.add('open');
    if (triggerBtn) triggerBtn.classList.add('active');

    // Reset search
    if (searchInput) {
      searchInput.value = '';
      searchClear.style.display = 'none';
      handleMegaSearch();
      setTimeout(() => searchInput.focus(), 80);
    }
  }

  function closeMegaMenu() {
    if (!menuEl) return;
    backdropEl.classList.remove('open');
    menuEl.classList.remove('open');
    if (triggerBtn) triggerBtn.classList.remove('active');
  }

  function toggleMegaMenu() {
    if (menuEl && menuEl.classList.contains('open')) {
      closeMegaMenu();
    } else {
      openMegaMenu();
    }
  }

  // --- Keyboard Shortcuts (Ctrl+K or /) ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMegaMenu();
      return;
    }

    const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) ||
                    document.activeElement.isContentEditable;

    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      toggleMegaMenu();
      return;
    }

    if (e.key === '/' && !inInput) {
      e.preventDefault();
      openMegaMenu();
      return;
    }
  });

  // --- Header Integration ---
  function mountHeaderDropdownButton() {
    // Check if button already exists
    if (document.getElementById('toolsNavDropdownBtn')) return;

    // Create Trigger Button
    triggerBtn = document.createElement('button');
    triggerBtn.type = 'button';
    triggerBtn.className = 'tools-nav-dropdown-btn';
    triggerBtn.id = 'toolsNavDropdownBtn';
    triggerBtn.setAttribute('aria-haspopup', 'dialog');
    triggerBtn.setAttribute('title', 'Quick access all 30+ tools (Ctrl+K)');
    triggerBtn.innerHTML = `
      <span class="btn-grid-icon">${SVG_ICONS['grid']}</span>
      <span>All Tools</span>
      ${SVG_ICONS['chevron']}
      <span class="btn-shortcut-badge">Ctrl+K</span>
    `;

    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMegaMenu();
    });

    // 1. Try mounting inside .nav-links (e.g. index.html)
    const navLinks = document.querySelector('.site-header .nav-links');
    if (navLinks) {
      // Insert as first item in nav-links
      navLinks.insertBefore(triggerBtn, navLinks.firstChild);

      // Also create a mobile button for .header-actions so mobile users have it too!
      const mobileBtn = document.createElement('button');
      mobileBtn.type = 'button';
      mobileBtn.className = 'tools-nav-dropdown-btn mobile-tools-nav-btn';
      mobileBtn.style.display = 'none';
      mobileBtn.setAttribute('title', 'All Tools');
      mobileBtn.innerHTML = `<span class="btn-grid-icon">${SVG_ICONS['grid']}</span> <span>Tools</span>`;
      mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMegaMenu();
      });

      const headerActions = document.querySelector('.site-header .header-actions');
      if (headerActions) {
        headerActions.insertBefore(mobileBtn, headerActions.firstChild);
      }
      return;
    }

    // 2. Try mounting inside .header-actions or editor header
    const headerActions = document.querySelector('.site-header .header-actions');
    if (headerActions) {
      // Insert before other action buttons
      headerActions.insertBefore(triggerBtn, headerActions.firstChild);
      return;
    }

    // 3. For editor.html header
    const editorActions = document.querySelector('.editor-header-actions, .editor-header-right');
    if (editorActions) {
      triggerBtn.classList.add('btn-header-action');
      editorActions.insertBefore(triggerBtn, editorActions.firstChild);
      return;
    }
  }

  // --- Homepage Live Search & Filter Pills Integration ---
  function initHomepageFinder() {
    const searchInput = document.getElementById('homeToolQuickSearch');
    const clearBtn = document.getElementById('homeToolSearchClear');
    const filterPills = document.querySelectorAll('.home-filter-pills .filter-pill');
    const toolCards = document.querySelectorAll('.category-group .tool-card');
    const categoryGroups = document.querySelectorAll('.category-group');
    const noResultsState = document.getElementById('homeSearchNoResults');

    if (!searchInput && filterPills.length === 0) return;

    let activeCategory = 'all';

    function filterHomepageTools() {
      const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = q ? 'inline-flex' : 'none';

      let totalVisible = 0;

      categoryGroups.forEach(group => {
        let groupHasVisibleCards = false;
        const cards = group.querySelectorAll('.tool-card');

        cards.forEach(card => {
          const title = (card.querySelector('h3') ? card.querySelector('h3').textContent : '').toLowerCase();
          const desc = (card.querySelector('p') ? card.querySelector('p').textContent : '').toLowerCase();
          const href = (card.getAttribute('href') || '').toLowerCase();
          const cardCat = card.dataset.category || '';

          const matchesQuery = !q || title.includes(q) || desc.includes(q) || href.includes(q);
          const matchesCategory = (activeCategory === 'all') || 
                                  (activeCategory === cardCat) ||
                                  (activeCategory === 'essentials' && card.classList.contains('premium-card')) ||
                                  (activeCategory === 'security-ai' && (cardCat === 'security' || cardCat === 'ai' || card.classList.contains('ai-card-style')));

          if (matchesQuery && matchesCategory) {
            card.style.display = '';
            groupHasVisibleCards = true;
            totalVisible++;
          } else {
            card.style.display = 'none';
          }
        });

        // Hide entire group header if no cards visible inside
        group.style.display = groupHasVisibleCards ? '' : 'none';
      });

      // Special handling for image-tools section
      const imageToolsSection = document.getElementById('image-tools');
      if (imageToolsSection) {
        if (activeCategory === 'all' || activeCategory === 'images') {
          imageToolsSection.style.display = '';
        } else {
          imageToolsSection.style.display = 'none';
        }
      }

      if (noResultsState) {
        if (totalVisible === 0) {
          noResultsState.classList.add('visible');
        } else {
          noResultsState.classList.remove('visible');
        }
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', filterHomepageTools);
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        filterHomepageTools();
        searchInput.focus();
      });
    }

    filterPills.forEach(pill => {
      pill.addEventListener('click', function () {
        filterPills.forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        activeCategory = this.dataset.category || 'all';
        filterHomepageTools();
      });
    });
  }

  // --- Auto-Initialize on DOM Ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountHeaderDropdownButton();
      initHomepageFinder();
    });
  } else {
    mountHeaderDropdownButton();
    initHomepageFinder();
  }

  // Global API
  window.PDFSuiteToolsMenu = {
    open: openMegaMenu,
    close: closeMegaMenu,
    toggle: toggleMegaMenu,
    tools: TOOLS
  };
})();
