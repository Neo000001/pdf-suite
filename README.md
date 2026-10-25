# PDFSuite 📄✨

**PDFSuite** is a free, fast, and 100% client-side privacy-first PDF and image manipulation toolkit. Everything runs directly in the user's browser without uploading files to remote servers.

---

## 🚀 Features & Tools

### PDF Essentials & Editing
- **[PDF Editor](public/editor.html)**: Add text, shapes, highlights, e-signatures, freehand annotations, and export documents.
- **[Merge PDF](public/merge.html)**: Reorder and combine multiple PDF files into one.
- **[Compress PDF](public/compress.html)**: Reduce PDF file size with multiple compression presets.
- **[Split PDF](public/split.html)**: Visually inspect and extract selected pages into a new document.
- **[Remove Pages](public/remove-pages.html)**: Delete unwanted pages from documents.
- **[Reorder / Rotate](public/reorder.html)**: Rotate orientations and drag-and-drop to reorder pages.

### Conversions (To & From PDF)
- **[PDF to Word](public/pdf-to-word.html)**: Extract native text and formatting into Word-compatible DOC format.
- **[Word to PDF](public/word-to-pdf.html)**: Convert modern DOCX files to PDF using browser rendering.
- **[PDF to Excel](public/pdf-to-excel.html)**: Extract table structures into CSV/Excel format.
- **[Excel to PDF](public/excel-to-pdf.html)**: Render spreadsheet worksheets and export to PDF.
- **[PDF to PowerPoint](public/pdf-to-ppt.html)**: Render PDF pages as high-resolution slide images bundled into ZIP.
- **[PDF to JPG](public/pdf-to-jpg.html)**: Export pages as individual JPGs or a single ZIP archive.
- **[JPG to PDF](public/jpg-to-pdf.html)**: Combine images into a single clean PDF document.
- **[PDF to Text](public/pdf-to-text.html)**: Fast raw text extraction from PDF pages.
- **[Scan to PDF](public/scan-to-pdf.html)**: Capture photos directly from webcam/mobile camera into a PDF.

### Advanced & Security
- **[OCR Text Extraction](public/ocr.html)**: Client-side optical character recognition powered by Tesseract.js.
- **[AI Summarizer](public/ai-summarizer.html)**: Extractive and client-side generative summarization (Transformers.js).
- **[Protect PDF](public/protect.html)**: Stamp confidential watermarks and security notices.
- **[Redact PDF](public/redact.html)**: Keyword-based automatic redaction and blackouts.
- **[Watermark PDF](public/watermark.html)**: Custom diagonal, header, footer, or repeating text watermarks.

### Image Suite
- Compress, resize, crop, rotate, remove background, metadata inspector, passport photo creator, QR code generator, format converters (PNG, JPG, WebP), and watermark tool.

---

## 🔒 Privacy

All processing happens client-side using JavaScript, WebAssembly, and HTML5 Canvas. Documents never leave the browser.

---

## 💻 Local Development

Serve the root directory with any static HTTP server:

```bash
# Using Python
python -m http.server 8080

# Using Node (npx)
npx serve .
```

Open `http://localhost:8080` in your web browser.

---

## 📜 License

See [LICENSE](LICENSE) for details.
