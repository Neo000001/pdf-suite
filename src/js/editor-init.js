// Simple PDF viewer for editor page

let pdfDoc = null;
let currentPage = 1;
let scale = 1.2;

let canvas, ctx, fileInput, thumbs, dropHint;

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("pdf-canvas");
  ctx = canvas.getContext("2d");
  fileInput = document.getElementById("file-input");
  thumbs = document.getElementById("thumbs");
  dropHint = document.getElementById("drop-hint");

  if (!window.pdfjsLib) {
    console.error("pdfjsLib not found – check PDF.js script tag.");
    return;
  }

  // Tell PDF.js where the worker is (CDN worker)
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
  const area = document.querySelector(".canvas-area");
  ["dragenter", "dragover"].forEach((ev) => {
    area.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      area.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    area.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      area.classList.remove("dragging");
    });
  });
  area.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please drop a PDF file.");
      return;
    }
    loadPdfFromFile(file);
  });
});

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
    })
    .catch((err) => {
      console.error("Error loading PDF:", err);
      alert("Could not open this PDF.");
    });
}

async function renderPage(num) {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.display = "block";

  const renderContext = {
    canvasContext: ctx,
    viewport,
  };
  await page.render(renderContext).promise;
}

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
