// PDFSuit Editor: PDF viewer + overlay tools + zoom + history + export

let pdfDoc = null;
let currentPage = 1;
let renderScale = 1.2; // internal PDF render scale (quality)

let canvas, ctx;
let drawCanvas, drawCtx;
let fileInput, thumbs, dropHint, textLayer, canvasArea, canvasInner;
let currentTool = "select";

let isDrawing = false;
let drawStartX = 0;
let drawStartY = 0;

let selectedBox = null;
let draggingBox = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// For rectangle preview (dotted box)
let rectPreviewImg = null;

// Undo / Redo history
let history = [];
let historyIndex = -1;

// View zoom (CSS scale)
let viewScale = 1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;
let zoomLabel, zoomInBtn, zoomOutBtn, zoomResetBtn;

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
  canvasInner = document.getElementById("canvas-inner");

  const toolButtons = document.querySelectorAll(".tool-btn[data-tool]");
  const saveBtn = document.getElementById("save-btn");
  const deleteBtn = document.getElementById("delete-btn");
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");

  zoomLabel = document.getElementById("zoom-label");
  zoomInBtn = document.getElementById("zoom-in-btn");
  zoomOutBtn = document.getElementById("zoom-out-btn");
  zoomResetBtn = document.getElementById("zoom-reset-btn");

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

  // Tool buttons
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

  // Click on main canvas to place text box
  canvas.addEventListener("click", (e) => {
    if (currentTool !== "text" || !pdfDoc) return;

    const { x, y } = getCanvasCoords(e, canvas);
    createTextBox(x, y, true);
    pushHistory();
  });

  // Delete key
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Delete" &&
      selectedBox &&
      document.activeElement !== selectedBox
    ) {
      selectedBox.remove();
      selectedBox = null;
      pushHistory();
    }
  });

  // Save button
  saveBtn.addEventListener("click", exportCurrentPageAsPdf);

  // Delete button
  deleteBtn.addEventListener("click", () => {
    if (selectedBox) {
      selectedBox.remove();
      selectedBox = null;
      pushHistory();
    } else {
      alert("Select a text box first (Select tool).");
    }
  });

  // Undo / Redo buttons
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);

  // Zoom buttons
  zoomInBtn.addEventListener("click", () => changeZoom(ZOOM_STEP));
  zoomOutBtn.addEventListener("click", () => changeZoom(-ZOOM_STEP));
  zoomResetBtn.addEventListener("click", () => fitZoom());

  updateZoomLabel();
  applyViewScale();
});

// --------- Helpers: coordinates & zoom ----------

// Convert mouse event into canvas coordinates (respect zoom)
function getCanvasCoords(e, targetCanvas) {
  const rect = targetCanvas.getBoundingClientRect();
  const scaleX = targetCanvas.width / rect.width;
  const scaleY = targetCanvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  return { x, y };
}

function applyViewScale() {
  if (!canvasInner) return;
  canvasInner.style.transform = `scale(${viewScale})`;
  updateZoomLabel();
}

function updateZoomLabel() {
  if (!zoomLabel) return;
  zoomLabel.textContent = `${Math.round(viewScale * 100)}%`;
}

function changeZoom(delta) {
  viewScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewScale + delta));
  applyViewScale();
}

function fitZoom() {
  // Simple "fit to width": scale canvas-inner so pdf width fits area width
  if (!canvas || !canvasArea) return;
  const areaRect = canvasArea.getBoundingClientRect();
  if (canvas.width === 0) {
    viewScale = 1;
  } else {
    const target = areaRect.width - 40; // some padding
    viewScale = Math.min(Math.max(target / canvas.width, MIN_ZOOM), MAX_ZOOM);
  }
  applyViewScale();
}

// ---------- PDF loading / rendering ----------

async function loadPdfFromFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  pdfjsLib
    .getDocument({ data: uint8Array })
    .promise.then((doc) => {
      pdfDoc = doc;
      currentPage = 1;
      buildThumbnails();
      renderPage(currentPage).then(() => {
        if (dropHint) dropHint.style.display = "none";
        clearOverlays();
        resetHistory();
        pushHistory(); // initial empty state
        fitZoom();
      });
    })
    .catch((err) => {
      console.error("Error loading PDF:", err);
      alert("Could not open this PDF.");
    });
}

async function renderPage(num) {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale: renderScale });

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
      renderPage(currentPage).then(() => {
        clearOverlays();
        resetHistory();
        pushHistory();
        fitZoom();
      });
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

// ---------- Tools ----------

function setTool(tool) {
  currentTool = tool;

  document.querySelectorAll(".tool-btn[data-tool]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tool === tool);
  });

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

// ---------- Text boxes ----------

function clearOverlays() {
  if (textLayer) textLayer.innerHTML = "";
  if (drawCtx && drawCanvas) {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  }
  selectedBox = null;
}

function initTextBox(div) {
  // drag + select
  div.addEventListener("mousedown", (e) => {
    if (currentTool === "select") {
      e.stopPropagation();
      selectBox(div);

      draggingBox = div;
      const rect = div.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;

      document.addEventListener("mousemove", onBoxDrag);
      document.addEventListener("mouseup", stopBoxDrag);
    }
  });
}

function createTextBox(x, y, focusOnCreate = false) {
  if (!textLayer) return null;

  const div = document.createElement("div");
  div.className = "text-box";
  div.contentEditable = "true";
  div.style.left = x + "px";
  div.style.top = y + "px";
  div.textContent = "Edit text…";

  initTextBox(div);
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

  return div;
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
  pushHistory();
}

// ---------- Drawing tools (with rect preview) ----------

function onPointerDown(e) {
  if (!pdfDoc) return;

  if (!["pen", "highlight", "rect", "eraser"].includes(currentTool)) return;

  isDrawing = true;
  const { x, y } = getCanvasCoords(e, drawCanvas);
  drawStartX = x;
  drawStartY = y;

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
    rectPreviewImg = drawCtx.getImageData(
      0,
      0,
      drawCanvas.width,
      drawCanvas.height
    );
  }

  if (
    currentTool === "pen" ||
    currentTool === "highlight" ||
    currentTool === "eraser"
  ) {
    drawCtx.beginPath();
    drawCtx.moveTo(drawStartX, drawStartY);
  }
}

function onPointerMove(e) {
  if (!isDrawing) return;

  const { x, y } = getCanvasCoords(e, drawCanvas);

  if (
    currentTool === "pen" ||
    currentTool === "highlight" ||
    currentTool === "eraser"
  ) {
    drawCtx.lineTo(x, y);
    drawCtx.stroke();
    return;
  }

  if (currentTool === "rect") {
    const w = x - drawStartX;
    const h = y - drawStartY;

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    if (rectPreviewImg) {
      drawCtx.putImageData(rectPreviewImg, 0, 0);
    }

    drawCtx.save();
    drawCtx.setLineDash([6, 4]);
    drawCtx.strokeStyle = "#60a5fa";
    drawCtx.lineWidth = 1;
    drawCtx.strokeRect(drawStartX, drawStartY, w, h);
    drawCtx.restore();
  }
}

function onPointerUp(e) {
  if (!isDrawing) return;
  isDrawing = false;

  if (currentTool === "rect") {
    const { x: endX, y: endY } = getCanvasCoords(e, drawCanvas);

    const w = endX - drawStartX;
    const h = endY - drawStartY;

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    if (rectPreviewImg) {
      drawCtx.putImageData(rectPreviewImg, 0, 0);
    }
    drawCtx.fillStyle = "#ffffff";
    drawCtx.globalAlpha = 1;
    drawCtx.globalCompositeOperation = "source-over";
    drawCtx.fillRect(drawStartX, drawStartY, w, h);
    rectPreviewImg = null;
  }

  drawCtx.globalAlpha = 1;
  drawCtx.globalCompositeOperation = "source-over";
  pushHistory();
}

// ---------- History (Undo / Redo) ----------

function resetHistory() {
  history = [];
  historyIndex = -1;
}

function pushHistory() {
  if (!drawCanvas || !textLayer) return;
  if (historyIndex < history.length - 1) {
    history = history.slice(0, historyIndex + 1);
  }
  const state = {
    drawData: drawCanvas.toDataURL(),
    textHtml: textLayer.innerHTML,
  };
  history.push(state);
  historyIndex = history.length - 1;
}

function restoreHistory(index) {
  if (index < 0 || index >= history.length) return;
  const state = history[index];

  const img = new Image();
  img.onload = () => {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawCtx.drawImage(img, 0, 0);
  };
  img.src = state.drawData;

  textLayer.innerHTML = state.textHtml;
  textLayer.querySelectorAll(".text-box").forEach((box) => {
    initTextBox(box);
  });

  selectedBox = null;
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    restoreHistory(historyIndex);
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    restoreHistory(historyIndex);
  }
}

// ---------- Export current page as flat PDF ----------

async function exportCurrentPageAsPdf() {
  if (!pdfDoc) {
    alert("Open a PDF first.");
    return;
  }

  if (!window.PDFLib) {
    alert("Export library (pdf-lib) not loaded.");
    return;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tctx = tempCanvas.getContext("2d");

  // base PDF
  tctx.drawImage(canvas, 0, 0);
  // drawings
  tctx.drawImage(drawCanvas, 0, 0);

  // text boxes
  document.querySelectorAll(".text-box").forEach((box) => {
    const x = parseFloat(box.style.left) || 0;
    const y = parseFloat(box.style.top) || 0;
    const text = box.innerText;
    tctx.font = "13px system-ui, sans-serif";
    tctx.fillStyle = "#111827";
    tctx.fillText(text, x, y + 12);
  });

  const dataUrl = tempCanvas.toDataURL("image/png");

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
