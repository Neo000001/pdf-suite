// PDFSuit Editor: PDF viewer + overlay tools (text, draw, rect, erase, export)

let pdfDoc = null;
let currentPage = 1;
let scale = 1.2;

let canvas, ctx;
let drawCanvas, drawCtx;
let fileInput, thumbs, dropHint, textLayer, canvasArea;
let currentTool = "select";
let addingText = false;

let isDrawing = false;
let drawStartX = 0;
let drawStartY = 0;

let selectedBox = null;
let draggingBox = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("pdf-canvas");
  ctx = canvas.getContext("2d");
  drawCanvas = document.getElementById("draw-canvas");
  drawCtx = drawCanvas.getContext("2d");

  fileInput = document.getElementById("file-input");
  thumbs = document.getElementById("thumbs");
  dropHint = document.getElementById("drop-hint");
  textLayer = document.getElementById("text-layer");
  canvasArea = document.querySelector(".canvas-area");

  // tool buttons
  const toolButtons = document.querySelectorAll(".tool-btn");
  const saveBtn = document.getElementById("save-btn");

  if (!window.pdfjsLib) {
    console.error("pdfjsLib not found – check PDF.js script tag.");
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

  // File input
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please choose a PDF file.");
      return;
    }
    loadPdfFromFile(file);
  });

  // Drag & drop
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

  // Tools
  toolButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool;
      setTool(tool);
    });
  });
  setTool("select");

  // Drawing canvas events
  drawCanvas.addEventListener("mousedown", onPointerDown);
  drawCanvas.addEventListener("mousemove", onPointerMove);
  drawCanvas.addEventListener("mouseup", onPointerUp);
  drawCanvas.addEventListener("mouseleave", onPointerUp);

  // Clicking on main canvas for text placement
  canvas.addEventListener("click", (e) => {
    if (currentTool !== "text" || !pdfDoc) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    createTextBox(x, y, true);
  });

  // Delete selected text box with Delete key
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Delete" &&
      selectedBox &&
      document.activeElement !== selectedBox
    ) {
      selectedBox.remove();
      selectedBox = null;
    }
  });

  // Save button
  saveBtn.addEventListener("click", exportCurrentPageAsPdf);
});

// -------- PDF loading / rendering --------

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
      clearOverlays();
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
  drawCanvas.width = viewport.width;
  drawCanvas.height = viewport.height;

  canvas.style.display = "block";
  drawCanvas.style.display = "block";

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
      clearOverlays();
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

// -------- Tools logic --------

function setTool(tool) {
  currentTool = tool;

  document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tool === tool);
  });

  // draw canvas pointer events only in draw tools
  const drawTools = ["pen", "highlight", "rect", "eraser"];
  drawCanvas.style.pointerEvents = drawTools.includes(tool) ? "auto" : "none";

  if (tool === "text") {
    canvas.style.cursor = "text";
  } else if (tool === "select") {
    canvas.style.cursor = "default";
  } else {
    canvas.style.cursor = "crosshair";
  }
}

// -------- Text boxes --------

function clearOverlays() {
  if (textLayer) textLayer.innerHTML = "";
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  selectedBox = null;
}

function createTextBox(x, y, focusOnCreate = false) {
  if (!textLayer) return;

  const div = document.createElement("div");
  div.className = "text-box";
  div.contentEditable = "true";

  div.style.left = x + "px";
  div.style.top = y + "px";
  div.textContent = "Edit text…";

  div.addEventListener("mousedown", (e) => {
    if (currentTool === "select") {
      e.stopPropagation();
      selectBox(div);

      // start drag
      draggingBox = div;
      const rect = div.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;

      document.addEventListener("mousemove", onBoxDrag);
      document.addEventListener("mouseup", stopBoxDrag);
    }
  });

  textLayer.appendChild(div);

  if (focusOnCreate) {
    selectBox(div);
    div.focus();
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function selectBox(div) {
  if (selectedBox) selectedBox.classList.remove("selected");
  selectedBox = div;
  div.classList.add("selected");
}

function onBoxDrag(e) {
  if (!draggingBox) return;
  const parentRect = textLayer.getBoundingClientRect();
  const x = e.clientX - parentRect.left - dragOffsetX;
  const y = e.clientY - parentRect.top - dragOffsetY;
  draggingBox.style.left = x + "px";
  draggingBox.style.top = y + "px";
}

function stopBoxDrag() {
  if (!draggingBox) return;
  draggingBox = null;
  document.removeEventListener("mousemove", onBoxDrag);
  document.removeEventListener("mouseup", stopBoxDrag);
}

// -------- Drawing (pen / highlight / rect / eraser) --------

function onPointerDown(e) {
  if (!pdfDoc) return;

  if (!["pen", "highlight", "rect", "eraser"].includes(currentTool)) return;

  isDrawing = true;
  const rect = drawCanvas.getBoundingClientRect();
  drawStartX = e.clientX - rect.left;
  drawStartY = e.clientY - rect.top;

  drawCtx.lineCap = "round";
  drawCtx.lineJoin = "round";

  if (currentTool === "pen") {
    drawCtx.strokeStyle = "#111827";
    drawCtx.lineWidth = 2;
    drawCtx.globalAlpha = 1;
    drawCtx.globalCompositeOperation = "source-over";
  } else if (currentTool === "highlight") {
    drawCtx.strokeStyle = "#facc15";
    drawCtx.lineWidth = 8;
    drawCtx.globalAlpha = 0.35;
    drawCtx.globalCompositeOperation = "source-over";
  } else if (currentTool === "eraser") {
    drawCtx.globalCompositeOperation = "destination-out";
    drawCtx.lineWidth = 14;
  } else if (currentTool === "rect") {
    drawCtx.globalCompositeOperation = "source-over";
    drawCtx.globalAlpha = 1;
  }

  if (currentTool === "pen" || currentTool === "highlight" || currentTool === "eraser") {
    drawCtx.beginPath();
    drawCtx.moveTo(drawStartX, drawStartY);
  }
}

function onPointerMove(e) {
  if (!isDrawing) return;
  const rect = drawCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (currentTool === "pen" || currentTool === "highlight" || currentTool === "eraser") {
    drawCtx.lineTo(x, y);
    drawCtx.stroke();
  }
  // rect tool will draw on mouseup only (simple implementation)
}

function onPointerUp(e) {
  if (!isDrawing) return;
  isDrawing = false;

  if (currentTool === "rect") {
    const rect = drawCanvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const w = endX - drawStartX;
    const h = endY - drawStartY;

    drawCtx.fillStyle = "#ffffff";
    drawCtx.globalAlpha = 1;
    drawCtx.globalCompositeOperation = "source-over";
    drawCtx.fillRect(drawStartX, drawStartY, w, h);
  }

  drawCtx.globalAlpha = 1;
  drawCtx.globalCompositeOperation = "source-over";
}

// -------- Export current page as flat PDF --------

async function exportCurrentPageAsPdf() {
  if (!pdfDoc) {
    alert("Open a PDF first.");
    return;
  }

  if (!window.PDFLib) {
    alert("Export library (pdf-lib) not loaded.");
    return;
  }

  // Create a temporary canvas merging PDF + drawings + text
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tctx = tempCanvas.getContext("2d");

  // base PDF
  tctx.drawImage(canvas, 0, 0);

  // drawings layer
  tctx.drawImage(drawCanvas, 0, 0);

  // text boxes
  document.querySelectorAll(".text-box").forEach((box) => {
    const x = parseFloat(box.style.left) || 0;
    const y = parseFloat(box.style.top) || 0;

    const text = box.innerText;
    tctx.font = "13px system-ui, sans-serif";
    tctx.fillStyle = "#111827";
    tctx.fillText(text, x, y + 12); // +12 for baseline
  });

  // turn into PNG
  const dataUrl = tempCanvas.toDataURL("image/png");

  // create PDF with same size
  const pdfDocOut = await PDFLib.PDFDocument.create();
  const page = pdfDocOut.addPage([canvas.width, canvas.height]);
  const pngImage = await pdfDocOut.embedPng(dataUrl);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
  });

  const pdfBytes = await pdfDocOut.save();
  downloadBlob(pdfBytes, "edited-page.pdf");
}

function downloadBlob(data, name) {
  const blob = new Blob([data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
