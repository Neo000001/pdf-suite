// Simple PDF viewer + text overlay editor

let pdfDoc = null;
let currentPage = 1;
let scale = 1.2;

let canvas, ctx, fileInput, thumbs, dropHint, textLayer, canvasArea, addTextBtn;
let addingText = false;

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("pdf-canvas");
  ctx = canvas.getContext("2d");
  fileInput = document.getElementById("file-input");
  thumbs = document.getElementById("thumbs");
  dropHint = document.getElementById("drop-hint");
  textLayer = document.getElementById("text-layer");
  canvasArea = document.querySelector(".canvas-area");
  addTextBtn = document.getElementById("add-text-btn");

  if (!window.pdfjsLib) {
    console.error("pdfjsLib not found – check PDF.js script tag.");
    return;
  }

  // configure worker from CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

  // File input handler
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please choose a PDF file.");
      return;
    }
    loadPdfFromFile(file);
  });

  // Drag & drop support
  ["dragenter", "dragover"].forEach((ev) => {
    canvasArea.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      canvasArea.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    canvasArea.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      canvasArea.classList.remove("dragging");
    });
  });
  canvasArea.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please drop a PDF file.");
      return;
    }
    loadPdfFromFile(file);
  });

  // Add Text tool toggle
  if (addTextBtn) {
    addTextBtn.addEventListener("click", () => {
      if (!pdfDoc) {
        alert("Open a PDF first.");
        return;
      }
      addingText = !addingText;
      addTextBtn.classList.toggle("active", addingText);
      addTextBtn.textContent = addingText ? "✔ Done" : "✏️ Add Text";

      canvas.style.cursor = addingText ? "text" : "default";
    });
  }

  // Click on canvas to place a text box when in "add text" mode
  canvas.addEventListener("click", (e) => {
    if (!addingText || !pdfDoc) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    createTextBox(x, y);
  });
});

// Load PDF
async function loadPdfFromFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  pdfjsLib
    .getDocument({ data: uint8Array })
    .promise.then((doc) => {
      pdfDoc = doc;
      currentPage = 1;
      buildThumbnails();
      renderPage(currentPage);
      if (dropHint) dropHint.style.display = "none";
      clearTextLayer();
    })
    .catch((err) => {
      console.error("Error loading PDF:", err);
      alert("Could not open this PDF.");
    });
}

// Render specific page
async function renderPage(num) {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.display = "block";

  // Match overlay size to canvas
  if (textLayer) {
    textLayer.style.width = canvas.width + "px";
    textLayer.style.height = canvas.height + "px";
  }

  const renderContext = {
    canvasContext: ctx,
    viewport,
  };
  await page.render(renderContext).promise;
}

// Thumbnails list
function buildThumbnails() {
  if (!pdfDoc || !thumbs) return;
  thumbs.innerHTML = "";

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const btn = document.createElement("button");
    btn.className = "thumb-btn";
    btn.textContent = `Page ${i}`;
    btn.addEventListener("click", () => {
      currentPage = i;
      renderPage(currentPage);
      setActiveThumb(i);
      clearTextLayer(); // text overlays currently per-page only
    });
    thumbs.appendChild(btn);
  }
  setActiveThumb(1);
}

function setActiveThumb(n) {
  document.querySelectorAll(".thumb-btn").forEach((b, idx) => {
    b.classList.toggle("active", idx + 1 === n);
  });
}

// Remove existing text boxes on page change or new file
function clearTextLayer() {
  if (!textLayer) return;
  textLayer.innerHTML = "";
}

// Create a new editable text box at canvas coordinates (x,y)
function createTextBox(x, y) {
  if (!textLayer) return;

  const div = document.createElement("div");
  div.className = "text-box";
  div.contentEditable = "true";

  // Position relative to text-layer
  div.style.left = x + "px";
  div.style.top = y + "px";

  div.textContent = "Edit text…";

  textLayer.appendChild(div);
  div.focus();

  // select all text when first focused
  const range = document.createRange();
  range.selectNodeContents(div);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
