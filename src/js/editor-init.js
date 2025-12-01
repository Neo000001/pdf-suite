// PDFSuit Editor – full logic
// - PDF.js render
// - simple multi-page support
// - zoom + pan
// - pen / highlight (box + brush)
// - text boxes + font formatting
// - signatures (draw, upload, type)
// - experimental Edit Text: click existing PDF text, white it out, and re-type

let pdfDoc = null;
let currentPage = 1;
let renderScale = 1.4; // base render scale

let canvas, ctx;
let drawCanvas, drawCtx;
let overlayLayer;
let canvasInner, canvasArea;
let dropHint, thumbs, pageLabel;

let currentTool = "select";
let highlightMode = "box"; // 'box' or 'brush'
let brushSize = 4;

let currentFontSize = 12;
let currentBold = false;
let currentItalic = false;

let selectedOverlay = null;
let draggingOverlay = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let isDrawing = false;
let drawStartX = 0;
let drawStartY = 0;
let rectPreviewImg = null;

// zoom & pan
let viewScale = 1;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;

let isPanning = false;
let panStartX = 0,
  panStartY = 0,
  panScrollLeft = 0,
  panScrollTop = 0;

// undo / redo
let history = [];
let historyIndex = -1;

// edit-text hit data
let currentTextHits = [];

// signature
let sigModal, sigDrawCanvas, sigDrawCtx;
let sigIsDrawing = false;

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("pdf-canvas");
  ctx = canvas.getContext("2d");
  drawCanvas = document.getElementById("draw-canvas");
  drawCtx = drawCanvas.getContext("2d");
  overlayLayer = document.getElementById("overlay-layer");

  canvasInner = document.getElementById("canvas-inner");
  canvasArea = document.querySelector(".canvas-wrapper");
  dropHint = document.getElementById("drop-hint");
  thumbs = document.getElementById("thumbs");
  pageLabel = document.getElementById("page-label");

  const fileInput = document.getElementById("file-input");
  const toolButtons = document.querySelectorAll(".tool-icon-btn");
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");
  const saveBtn = document.getElementById("save-btn");

  const zoomInBtn = document.getElementById("zoom-in-btn");
  const zoomOutBtn = document.getElementById("zoom-out-btn");
  const zoomResetBtn = document.getElementById("zoom-reset-btn");
  const zoomLabel = document.getElementById("zoom-label");

  const fontSizeSelect = document.getElementById("font-size");
  const boldBtn = document.getElementById("bold-btn");
  const italicBtn = document.getElementById("italic-btn");
  const brushSizeInput = document.getElementById("brush-size");

  const hlBoxBtn = document.getElementById("hl-mode-box");
  const hlBrushBtn = document.getElementById("hl-mode-brush");

  // signature modal refs
  sigModal = document.getElementById("signature-modal");
  sigDrawCanvas = document.getElementById("sig-draw-canvas");
  sigDrawCtx = sigDrawCanvas.getContext("2d");

  // PDF.js worker
  if (!window.pdfjsLib) {
    alert("PDF engine failed to load.");
    return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

  // --- File open ---
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please choose a PDF file.");
      return;
    }
    loadPdfFromFile(file);
  });

  // drag & drop for pdf
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

  // --- Tools ---
  toolButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool;
      if (tool === "signature") {
        openSignatureModal();
        return;
      }
      if (tool === "edit-text") {
        setTool("edit-text");
      } else {
        setTool(tool);
      }
      toolButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // drawing events
  drawCanvas.addEventListener("mousedown", onDrawDown);
  drawCanvas.addEventListener("mousemove", onDrawMove);
  drawCanvas.addEventListener("mouseup", onDrawUp);
  drawCanvas.addEventListener("mouseleave", onDrawUp);

  // add text box on click
  canvas.addEventListener("click", (e) => {
    if (currentTool !== "text" || !pdfDoc) return;
    const { x, y } = getCanvasCoords(e, canvas);
    const box = createTextBox(x, y);
    focusTextBox(box);
    pushHistory();
  });

  // overlay click for edit-text / select
  overlayLayer.addEventListener("mousedown", (e) => {
    const target = e.target;

    // click on hit for edit-text
    if (
      currentTool === "edit-text" &&
      target.classList.contains("pdf-hit") &&
      pdfDoc
    ) {
      e.stopPropagation();
      startEditExistingText(target);
      return;
    }

    // click on overlay object / text box for select & drag
    if (
      target.classList.contains("text-box") ||
      target.classList.contains("overlay-object")
    ) {
      e.stopPropagation();
      if (currentTool === "select") {
        selectOverlay(target);
        startDragOverlay(target, e);
      }
    }
  });

  // global mouseup for overlay drag
  document.addEventListener("mouseup", stopDragOverlay);
  document.addEventListener("mousemove", onOverlayDragMove);

  // delete key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" && selectedOverlay) {
      selectedOverlay.remove();
      selectedOverlay = null;
      pushHistory();
    }
  });

  // undo / redo / save
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);
  saveBtn.addEventListener("click", exportCurrentPageAsPdf);

  // zoom
  zoomInBtn.addEventListener("click", () => changeZoom(0.15));
  zoomOutBtn.addEventListener("click", () => changeZoom(-0.15));
  zoomResetBtn.addEventListener("click", () => {
    fitZoom();
  });

  function updateZoomLabel() {
    if (zoomLabel) zoomLabel.textContent = `${Math.round(viewScale * 100)}%`;
  }
  window.updateZoomLabel = updateZoomLabel;

  // pan / hand tool
  canvasArea.addEventListener("mousedown", (ev) => {
    if (currentTool !== "hand") return;
    isPanning = true;
    panStartX = ev.clientX;
    panStartY = ev.clientY;
    panScrollLeft = canvasArea.scrollLeft;
    panScrollTop = canvasArea.scrollTop;
    canvasArea.style.cursor = "grabbing";
  });
  document.addEventListener("mousemove", (ev) => {
    if (!isPanning) return;
    const dx = ev.clientX - panStartX;
    const dy = ev.clientY - panStartY;
    canvasArea.scrollLeft = panScrollLeft - dx;
    canvasArea.scrollTop = panScrollTop - dy;
  });
  document.addEventListener("mouseup", () => {
    if (isPanning) {
      isPanning = false;
      canvasArea.style.cursor = "";
    }
  });

  // font controls
  fontSizeSelect.addEventListener("change", () => {
    currentFontSize = parseInt(fontSizeSelect.value, 10) || 12;
    if (selectedOverlay && selectedOverlay.classList.contains("text-box")) {
      selectedOverlay.style.fontSize = currentFontSize + "px";
      pushHistory();
    }
  });
  boldBtn.addEventListener("click", () => {
    currentBold = !currentBold;
    boldBtn.classList.toggle("active", currentBold);
    if (selectedOverlay && selectedOverlay.classList.contains("text-box")) {
      selectedOverlay.style.fontWeight = currentBold ? "700" : "400";
      pushHistory();
    }
  });
  italicBtn.addEventListener("click", () => {
    currentItalic = !currentItalic;
    italicBtn.classList.toggle("active", currentItalic);
    if (selectedOverlay && selectedOverlay.classList.contains("text-box")) {
      selectedOverlay.style.fontStyle = currentItalic ? "italic" : "normal";
      pushHistory();
    }
  });

  // brush size
  brushSizeInput.addEventListener("input", () => {
    brushSize = parseInt(brushSizeInput.value, 10) || 4;
  });

  // highlight mode
  hlBoxBtn.addEventListener("click", () => {
    highlightMode = "box";
    hlBoxBtn.classList.add("active");
    hlBrushBtn.classList.remove("active");
  });
  hlBrushBtn.addEventListener("click", () => {
    highlightMode = "brush";
    hlBrushBtn.classList.add("active");
    hlBoxBtn.classList.remove("active");
  });

  // signature draw canvas
  resizeSignatureCanvas();
  sigDrawCanvas.addEventListener("mousedown", (e) => {
    sigIsDrawing = true;
    const { x, y } = getLocalCoords(e, sigDrawCanvas);
    sigDrawCtx.beginPath();
    sigDrawCtx.moveTo(x, y);
  });
  sigDrawCanvas.addEventListener("mousemove", (e) => {
    if (!sigIsDrawing) return;
    const { x, y } = getLocalCoords(e, sigDrawCanvas);
    sigDrawCtx.lineTo(x, y);
    sigDrawCtx.strokeStyle = "#111827";
    sigDrawCtx.lineWidth = 2;
    sigDrawCtx.lineCap = "round";
    sigDrawCtx.stroke();
  });
  sigDrawCanvas.addEventListener("mouseup", () => (sigIsDrawing = false));
  sigDrawCanvas.addEventListener("mouseleave", () => (sigIsDrawing = false));

  // signature modal controls
  const sigClearBtn = document.getElementById("sig-clear-btn");
  const sigSaveBtn = document.getElementById("sig-save-btn");
  const sigCloseBtn = document.getElementById("sig-close-btn");
  const sigTabs = document.querySelectorAll(".sig-tab");
  const sigBodies = document.querySelectorAll(".sig-tab-body");
  const sigUploadInput = document.getElementById("sig-upload-input");
  const sigUploadSaveBtn = document.getElementById("sig-upload-save-btn");
  const sigTypeInput = document.getElementById("sig-type-input");
  const sigFontSelect = document.getElementById("sig-font-select");
  const sigTypeSaveBtn = document.getElementById("sig-type-save-btn");

  sigClearBtn.addEventListener("click", () => {
    sigDrawCtx.clearRect(0, 0, sigDrawCanvas.width, sigDrawCanvas.height);
  });
  sigSaveBtn.addEventListener("click", () => {
    const imgUrl = sigDrawCanvas.toDataURL("image/png");
    addImageOverlay(imgUrl);
    closeSignatureModal();
    pushHistory();
  });
  sigCloseBtn.addEventListener("click", closeSignatureModal);

  sigTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      sigTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      sigBodies.forEach((body) => {
        body.classList.toggle(
          "hidden",
          body.getAttribute("data-tab-body") !== name
        );
      });
    });
  });

  sigUploadSaveBtn.addEventListener("click", () => {
    const file = sigUploadInput.files && sigUploadInput.files[0];
    if (!file) {
      alert("Choose an image first.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      addImageOverlay(ev.target.result);
      closeSignatureModal();
      pushHistory();
    };
    reader.readAsDataURL(file);
  });

  sigTypeSaveBtn.addEventListener("click", () => {
    const text = sigTypeInput.value.trim();
    if (!text) {
      alert("Type your name.");
      return;
    }
    const font = sigFontSelect.value || "'Segoe Script', cursive";
    addTypedSignature(text, font);
    closeSignatureModal();
    pushHistory();
  });

  window.addEventListener("resize", resizeSignatureCanvas);

  // init zoom label
  updateZoom();
});

function updateZoom() {
  const zoomLabel = document.getElementById("zoom-label");
  if (zoomLabel) zoomLabel.textContent = `${Math.round(viewScale * 100)}%`;
}

/* ---------------- PDF LOADING & RENDER ---------------- */

async function loadPdfFromFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  pdfjsLib
    .getDocument({ data: uint8Array })
    .promise.then(async (doc) => {
      pdfDoc = doc;
      currentPage = 1;
      buildThumbnails();
      await renderPage(currentPage);
      if (dropHint) dropHint.style.display = "none";
      clearOverlays();
      resetHistory();
      pushHistory();
      fitZoom();
    })
    .catch((err) => {
      console.error(err);
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
  overlayLayer.style.width = canvas.width + "px";
  overlayLayer.style.height = canvas.height + "px";

  canvas.style.display = "block";
  drawCanvas.style.display = "block";

  const renderContext = {
    canvasContext: ctx,
    viewport,
  };
  await page.render(renderContext).promise;

  // build hit boxes for edit-text
  await buildTextHits(page, viewport);

  updatePageLabel();
  applyViewScale();
}

function updatePageLabel() {
  if (!pageLabel || !pdfDoc) return;
  pageLabel.textContent = `Page ${currentPage} / ${pdfDoc.numPages}`;
}

function buildThumbnails() {
  if (!pdfDoc || !thumbs) return;
  thumbs.innerHTML = "";
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const btn = document.createElement("button");
    btn.className = "thumb-btn";
    btn.textContent = `Page ${i}`;
    btn.addEventListener("click", async () => {
      currentPage = i;
      await renderPage(currentPage);
      clearOverlays();
      resetHistory();
      pushHistory();
      fitZoom();
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

/* ---------------- ZOOM & PAN ---------------- */

function applyViewScale() {
  if (!canvas || !canvasInner || !canvasArea) return;

  const scaledW = Math.round(canvas.width * viewScale);
  const scaledH = Math.round(canvas.height * viewScale);

  canvasInner.style.transformOrigin = "top left";
  canvasInner.style.transform = `scale(${viewScale})`;
  canvasInner.style.width = scaledW + "px";
  canvasInner.style.height = scaledH + "px";

  updateZoom();
}

function changeZoom(delta) {
  viewScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewScale + delta));
  applyViewScale();
}

function fitZoom() {
  if (!canvas || !canvasArea) return;
  const bounds = canvasArea.getBoundingClientRect();
  const targetW = bounds.width - 80;
  if (canvas.width === 0) {
    viewScale = 1;
  } else {
    viewScale = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, targetW / canvas.width)
    );
  }
  applyViewScale();
}

/* ---------------- TOOLS ---------------- */

function setTool(tool) {
  currentTool = tool;

  const drawTools = ["pen", "highlight", "rect", "eraser"];
  drawCanvas.style.pointerEvents = drawTools.includes(tool) ? "auto" : "none";

  if (tool === "hand") {
    canvas.style.cursor = "grab";
    canvasArea.style.cursor = "grab";
  } else if (tool === "text" || tool === "edit-text") {
    canvas.style.cursor = "text";
    canvasArea.style.cursor = "default";
  } else if (tool === "select") {
    canvas.style.cursor = "default";
    canvasArea.style.cursor = "default";
  } else {
    canvas.style.cursor = "crosshair";
    canvasArea.style.cursor = "default";
  }

  // hit boxes interactive only for edit-text
  overlayLayer
    .querySelectorAll(".pdf-hit")
    .forEach((h) => (h.style.pointerEvents = tool === "edit-text" ? "auto" : "none"));
}

function clearOverlays() {
  overlayLayer.innerHTML = "";
  selectedOverlay = null;
  currentTextHits = [];
}

/* ---------------- TEXT BOXES & OVERLAYS ---------------- */

function createTextBox(x, y, width = 120, height = 24) {
  const div = document.createElement("div");
  div.className = "text-box";
  div.contentEditable = "true";
  div.style.left = x + "px";
  div.style.top = y + "px";
  div.style.fontSize = currentFontSize + "px";
  div.style.fontWeight = currentBold ? "700" : "400";
  div.style.fontStyle = currentItalic ? "italic" : "normal";
  div.textContent = "Edit text…";

  overlayLayer.appendChild(div);
  initOverlayDrag(div);
  return div;
}

function selectOverlay(el) {
  if (selectedOverlay) selectedOverlay.classList.remove("selected");
  selectedOverlay = el;
  if (el) el.classList.add("selected");
}

function focusTextBox(box) {
  selectOverlay(box);
  box.focus();
  const range = document.createRange();
  range.selectNodeContents(box);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function initOverlayDrag(el) {
  el.addEventListener("mousedown", (e) => {
    if (currentTool !== "select") return;
    e.stopPropagation();
    startDragOverlay(el, e);
  });
}

function startDragOverlay(el, e) {
  draggingOverlay = el;
  selectOverlay(el);
  const parentRect = overlayLayer.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;

  document.body.style.userSelect = "none";
}

function onOverlayDragMove(e) {
  if (!draggingOverlay) return;
  const parentRect = overlayLayer.getBoundingClientRect();
  const x = e.clientX - parentRect.left - dragOffsetX;
  const y = e.clientY - parentRect.top - dragOffsetY;
  draggingOverlay.style.left = x + "px";
  draggingOverlay.style.top = y + "px";
}

function stopDragOverlay() {
  if (!draggingOverlay) return;
  draggingOverlay = null;
  document.body.style.userSelect = "";
  pushHistory();
}

function addImageOverlay(dataUrl) {
  const wrapper = document.createElement("div");
  wrapper.className = "overlay-object";
  wrapper.style.left = "40px";
  wrapper.style.top = "40px";
  wrapper.style.background = "transparent";

  const img = document.createElement("img");
  img.src = dataUrl;
  img.style.width = "160px";
  img.style.height = "auto";
  wrapper.appendChild(img);

  overlayLayer.appendChild(wrapper);
  initOverlayDrag(wrapper);
}

function addTypedSignature(text, fontFamily) {
  const div = document.createElement("div");
  div.className = "overlay-object";
  div.style.left = "40px";
  div.style.top = "40px";
  div.style.background = "transparent";
  div.style.border = "none";
  div.style.fontFamily = fontFamily;
  div.style.fontSize = "22px";
  div.textContent = text;
  overlayLayer.appendChild(div);
  initOverlayDrag(div);
}

/* ---------------- DRAWING TOOLS ---------------- */

function onDrawDown(e) {
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
    drawCtx.lineWidth = brushSize;
    drawCtx.globalAlpha = 1;
    drawCtx.globalCompositeOperation = "source-over";
    drawCtx.beginPath();
    drawCtx.moveTo(drawStartX, drawStartY);
  } else if (currentTool === "highlight") {
    if (highlightMode === "brush") {
      drawCtx.strokeStyle = "#fde047";
      drawCtx.lineWidth = brushSize * 1.6;
      drawCtx.globalAlpha = 0.25;
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.beginPath();
      drawCtx.moveTo(drawStartX, drawStartY);
    } else {
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.globalAlpha = 1;
      rectPreviewImg = drawCtx.getImageData(
        0,
        0,
        drawCanvas.width,
        drawCanvas.height
      );
    }
  } else if (currentTool === "eraser") {
    drawCtx.globalCompositeOperation = "destination-out";
    drawCtx.globalAlpha = 1;
    drawCtx.lineWidth = brushSize * 3;
    drawCtx.beginPath();
    drawCtx.moveTo(drawStartX, drawStartY);
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
}

function onDrawMove(e) {
  if (!isDrawing) return;
  const { x, y } = getCanvasCoords(e, drawCanvas);

  if (
    currentTool === "pen" ||
    currentTool === "eraser" ||
    (currentTool === "highlight" && highlightMode === "brush")
  ) {
    drawCtx.lineTo(x, y);
    drawCtx.stroke();
    return;
  }

  if (currentTool === "rect" || (currentTool === "highlight" && highlightMode === "box")) {
    const w = x - drawStartX;
    const h = y - drawStartY;

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    if (rectPreviewImg) drawCtx.putImageData(rectPreviewImg, 0, 0);

    if (currentTool === "rect") {
      drawCtx.save();
      drawCtx.setLineDash([6, 4]);
      drawCtx.strokeStyle = "#60a5fa";
      drawCtx.lineWidth = 1;
      drawCtx.strokeRect(drawStartX, drawStartY, w, h);
      drawCtx.restore();
    } else if (currentTool === "highlight" && highlightMode === "box") {
      drawCtx.save();
      const height = Math.max(12, Math.min(Math.abs(h), 22));
      const top = h >= 0 ? drawStartY : drawStartY - height;
      drawCtx.fillStyle = "rgba(253,224,71,0.25)";
      drawCtx.fillRect(drawStartX, top, w, height);
      drawCtx.restore();
    }
  }
}

function onDrawUp(e) {
  if (!isDrawing) return;
  isDrawing = false;

  if (currentTool === "rect" || (currentTool === "highlight" && highlightMode === "box")) {
    const { x: endX, y: endY } = getCanvasCoords(e, drawCanvas);
    const w = endX - drawStartX;
    const h = endY - drawStartY;

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    if (rectPreviewImg) drawCtx.putImageData(rectPreviewImg, 0, 0);

    if (currentTool === "rect") {
      drawCtx.fillStyle = "#ffffff";
      drawCtx.globalAlpha = 1;
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.fillRect(drawStartX, drawStartY, w, h);
    } else if (currentTool === "highlight" && highlightMode === "box") {
      const height = Math.max(12, Math.min(Math.abs(h), 22));
      const top = h >= 0 ? drawStartY : drawStartY - height;
      drawCtx.fillStyle = "rgba(253,224,71,0.25)";
      drawCtx.globalAlpha = 1;
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.fillRect(drawStartX, top, w, height);
    }
    rectPreviewImg = null;
  }

  drawCtx.globalAlpha = 1;
  drawCtx.globalCompositeOperation = "source-over";
  pushHistory();
}

/* ---------------- HISTORY ---------------- */

function resetHistory() {
  history = [];
  historyIndex = -1;
}

function pushHistory() {
  if (!drawCanvas || !overlayLayer) return;
  if (historyIndex < history.length - 1) {
    history = history.slice(0, historyIndex + 1);
  }
  const state = {
    drawData: drawCanvas.toDataURL(),
    overlayHtml: overlayLayer.innerHTML,
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

  overlayLayer.innerHTML = state.overlayHtml;
  overlayLayer
    .querySelectorAll(".text-box, .overlay-object")
    .forEach((el) => initOverlayDrag(el));
  selectOverlay(null);
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

/* ---------------- EDIT TEXT (PDF) ---------------- */

async function buildTextHits(page, viewport) {
  currentTextHits = [];
  overlayLayer.querySelectorAll(".pdf-hit").forEach((n) => n.remove());

  const textContent = await page.getTextContent();
  const style = textContent.styles || {};

  textContent.items.forEach((item) => {
    const tx = pdfjsLib.Util.transform(
      pdfjsLib.Util.transform(viewport.transform, item.transform),
      [1, 0, 0, -1, 0, 0]
    );
    const x = tx[4];
    const y = tx[5];
    const fontHeight = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
    const width = item.width * viewport.scale;
    const height = fontHeight;

    const top = y - height;

    const hit = document.createElement("div");
    hit.className = "pdf-hit";
    hit.style.left = x + "px";
    hit.style.top = top + "px";
    hit.style.width = width + "px";
    hit.style.height = height + "px";
    hit.title = "Click to edit text";
    hit.dataset.x = x;
    hit.dataset.y = top;
    hit.dataset.w = width;
    hit.dataset.h = height;
    hit.dataset.text = item.str;

    overlayLayer.appendChild(hit);
    currentTextHits.push(hit);
  });

  // pointer-events only when edit-text tool
  overlayLayer
    .querySelectorAll(".pdf-hit")
    .forEach((h) => (h.style.pointerEvents = currentTool === "edit-text" ? "auto" : "none"));
}

function startEditExistingText(hitEl) {
  const x = parseFloat(hitEl.dataset.x);
  const y = parseFloat(hitEl.dataset.y);
  const w = parseFloat(hitEl.dataset.w);
  const h = parseFloat(hitEl.dataset.h);
  const originalText = hitEl.dataset.text || "";

  // white out the original text area on draw layer
  drawCtx.fillStyle = "#ffffff";
  drawCtx.globalAlpha = 1;
  drawCtx.globalCompositeOperation = "source-over";
  drawCtx.fillRect(x, y, w, h);

  // create overlay text box over it
  const box = createTextBox(x, y, w, h);
  box.textContent = originalText || "Edit text…";
  focusTextBox(box);
  pushHistory();
}

/* ---------------- EXPORT ---------------- */

async function exportCurrentPageAsPdf() {
  if (!pdfDoc) {
    alert("Open a PDF first.");
    return;
  }
  if (!window.PDFLib) {
    alert("PDF export engine missing.");
    return;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tctx = tempCanvas.getContext("2d");

  // base pdf
  tctx.drawImage(canvas, 0, 0);
  // drawings (highlight/pen/rect)
  tctx.drawImage(drawCanvas, 0, 0);

  // overlays
  overlayLayer
    .querySelectorAll(".text-box, .overlay-object")
    .forEach((node) => {
      const x = parseFloat(node.style.left) || 0;
      const y = parseFloat(node.style.top) || 0;

      if (node.classList.contains("overlay-object")) {
        const img = node.querySelector("img");
        if (img) {
          const w = img.offsetWidth;
          const h = img.offsetHeight;
          tctx.drawImage(img, x, y, w, h);
        } else {
          const style = window.getComputedStyle(node);
          const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const color = style.color || "#111827";
          tctx.font = font;
          tctx.fillStyle = color;
          tctx.fillText(node.innerText, x, y + parseInt(style.fontSize, 10));
        }
      } else if (node.classList.contains("text-box")) {
        const style = window.getComputedStyle(node);
        const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const color = style.color || "#111827";
        tctx.font = font;
        tctx.fillStyle = color;
        const fontSize = parseInt(style.fontSize, 10) || 13;
        tctx.fillText(node.innerText, x, y + fontSize);
      }
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

/* ---------------- SIGNATURE MODAL HELPERS ---------------- */

function openSignatureModal() {
  if (!sigModal) return;
  sigModal.classList.remove("hidden");
  sigDrawCtx.clearRect(0, 0, sigDrawCanvas.width, sigDrawCanvas.height);
}

function closeSignatureModal() {
  if (!sigModal) return;
  sigModal.classList.add("hidden");
}

function resizeSignatureCanvas() {
  if (!sigDrawCanvas) return;
  const width = sigDrawCanvas.clientWidth || 360;
  sigDrawCanvas.width = width;
  sigDrawCanvas.height = 160;
  sigDrawCtx.clearRect(0, 0, sigDrawCanvas.width, sigDrawCanvas.height);
}

/* ---------------- UTILS ---------------- */

function getCanvasCoords(e, targetCanvas) {
  const rect = targetCanvas.getBoundingClientRect();
  const scaleX = targetCanvas.width / rect.width;
  const scaleY = targetCanvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  return { x, y };
}

function getLocalCoords(e, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}
