// PDFSuit Editor core
// - PDF.js rendering
// - overlay drawing & text
// - zoom
// - highlight box/brush
// - basic signature (draw + upload + type -> overlay image/text)
// NOTE: "edit-text" tool is stubbed for now (real inline edit coming later)

let pdfDoc = null;
let currentPage = 1;
let renderScale = 1.2;

let canvas, ctx;
let drawCanvas, drawCtx;
let fileInput, thumbs, dropHint, textLayer, canvasArea, canvasInner;
let pageLabel;

let currentTool = "select";
let highlightMode = "box"; // 'box' or 'brush'

let isDrawing = false;
let drawStartX = 0;
let drawStartY = 0;

let selectedBox = null;
let draggingBox = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let rectPreviewImg = null;

// Undo / redo
let history = [];
let historyIndex = -1;

// Zoom
let viewScale = 1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;
let zoomLabel;

// Signature modal pieces
let sigModal;
let sigDrawCanvas, sigDrawCtx;
let sigIsDrawing = false;

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("pdf-canvas");
  ctx = canvas.getContext("2d");
  drawCanvas = document.getElementById("draw-canvas");
  drawCtx = drawCanvas.getContext("2d");

  fileInput = document.getElementById("file-input");
  thumbs = document.getElementById("thumbs");
  dropHint = document.getElementById("drop-hint");
  textLayer = document.getElementById("text-layer");
  canvasArea = document.querySelector(".canvas-wrapper");
  canvasInner = document.getElementById("canvas-inner");
  pageLabel = document.getElementById("page-label");

  const toolButtons = document.querySelectorAll(".tool-icon-btn[data-tool]");
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");
  const saveBtn = document.getElementById("save-btn");

  const zoomInBtn = document.getElementById("zoom-in-btn");
  const zoomOutBtn = document.getElementById("zoom-out-btn");
  const zoomResetBtn = document.getElementById("zoom-reset-btn");
  zoomLabel = document.getElementById("zoom-label");

  // Highlight mode buttons
  const hlBoxBtn = document.getElementById("hl-mode-box");
  const hlBrushBtn = document.getElementById("hl-mode-brush");

  // Signature modal refs
  sigModal = document.getElementById("signature-modal");
  sigDrawCanvas = document.getElementById("sig-draw-canvas");
  sigDrawCtx = sigDrawCanvas.getContext("2d");

  // Resize signature canvas
  resizeSignatureCanvas();

  // PDF.js worker
  if (!window.pdfjsLib) {
    console.error("pdfjsLib not found.");
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
      if (tool === "signature") {
        openSignatureModal();
        return;
      }
      if (tool === "edit-text") {
        alert(
          "Inline text editing is coming soon. For now, use 'Add Text' + white rectangle to replace text."
        );
        return;
      }
      setTool(tool);
      toolButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
  // default tool
  const selectBtn = document.querySelector('.tool-icon-btn[data-tool="select"]');
  if (selectBtn) selectBtn.classList.add("active");
  currentTool = "select";

  // Draw canvas events
  drawCanvas.addEventListener("mousedown", onPointerDown);
  drawCanvas.addEventListener("mousemove", onPointerMove);
  drawCanvas.addEventListener("mouseup", onPointerUp);
  drawCanvas.addEventListener("mouseleave", onPointerUp);

  // Add text box on main canvas click
  canvas.addEventListener("click", (e) => {
    if (currentTool !== "text" || !pdfDoc) return;
    const { x, y } = getCanvasCoords(e, canvas);
    createTextBox(x, y, true);
    pushHistory();
  });

  // Delete key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" && selectedBox) {
      selectedBox.remove();
      selectedBox = null;
      pushHistory();
    }
  });

  // Undo / redo
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);

  // Save
  saveBtn.addEventListener("click", exportCurrentPageAsPdf);

  // Zoom buttons
  zoomInBtn.addEventListener("click", () => changeZoom(ZOOM_STEP));
  zoomOutBtn.addEventListener("click", () => changeZoom(-ZOOM_STEP));
  zoomResetBtn.addEventListener("click", () => fitZoom());

  updateZoomLabel();
  applyViewScale();

  // Highlight mode toggle
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

  // Signature drawing canvas events
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
  sigDrawCanvas.addEventListener("mouseup", () => {
    sigIsDrawing = false;
  });
  sigDrawCanvas.addEventListener("mouseleave", () => {
    sigIsDrawing = false;
  });

  // Signature modal buttons
  const sigClearBtn = document.getElementById("sig-clear-btn");
  const sigSaveBtn = document.getElementById("sig-save-btn");
  const sigCloseBtn = document.getElementById("sig-close-btn");
  const sigTabs = document.querySelectorAll(".sig-tab");
  const sigBodies = document.querySelectorAll(".sig-tab-body");
  const sigUploadInput = document.getElementById("sig-upload-input");
  const sigUploadSaveBtn = document.getElementById("sig-upload-save-btn");
  const sigTypeSaveBtn = document.getElementById("sig-type-save-btn");
  const sigTypeInput = document.getElementById("sig-type-input");
  const sigFontSelect = document.getElementById("sig-font-select");

  sigClearBtn.addEventListener("click", () => {
    sigDrawCtx.clearRect(0, 0, sigDrawCanvas.width, sigDrawCanvas.height);
  });

  sigSaveBtn.addEventListener("click", () => {
    const imgUrl = sigDrawCanvas.toDataURL("image/png");
    addImageOverlay(imgUrl);
    closeSignatureModal();
    pushHistory();
  });

  sigCloseBtn.addEventListener("click", () => {
    closeSignatureModal();
  });

  sigTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;
      sigTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      sigBodies.forEach((body) => {
        body.classList.toggle(
          "hidden",
          body.getAttribute("data-tab-body") !== tabName
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
      alert("Type a name.");
      return;
    }
    const fontFamily = sigFontSelect.value || "'Segoe Script', cursive";
    addTypedSignature(text, fontFamily);
    closeSignatureModal();
    pushHistory();
  });

  window.addEventListener("resize", () => {
    resizeSignatureCanvas();
  });
});

// ---------- Utility: coordinates ----------

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

// ---------- Zoom ----------

function applyViewScale() {
  if (!canvasInner || !canvasArea) return;

  const area = canvasArea;
  const inner = canvasInner;

  const prevWidth = inner.offsetWidth || 1;
  const prevCenter =
    area.scrollLeft + area.clientWidth / 2;
  const prevCenterRatio = prevCenter / prevWidth;

  inner.style.transform = `scale(${viewScale})`;
  updateZoomLabel();

  requestAnimationFrame(() => {
    const newWidth = inner.offsetWidth || 1;
    const newCenter = prevCenterRatio * newWidth;
    const newScrollLeft = Math.max(0, newCenter - area.clientWidth / 2);
    area.scrollLeft = newScrollLeft;
  });
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
  if (!canvas || !canvasArea) return;
  const areaRect = canvasArea.getBoundingClientRect();
  if (canvas.width === 0) {
    viewScale = 1;
  } else {
    const target = areaRect.width - 40;
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
        pushHistory();
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

  updatePageLabel();
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

  const drawTools = ["pen", "highlight", "rect", "eraser"];
  drawCanvas.style.pointerEvents = drawTools.includes(tool) ? "auto" : "none";

  if (tool === "text") {
    canvas.style.cursor = "text";
  } else if (tool === "hand") {
    canvas.style.cursor = "grab";
    canvasArea.style.cursor = "grab";
  } else if (tool === "select") {
    canvas.style.cursor = "default";
    canvasArea.style.cursor = "default";
  } else {
    canvas.style.cursor = "crosshair";
    canvasArea.style.cursor = "default";
  }
}

// ---------- Text boxes & overlay objects ----------

function clearOverlays() {
  if (textLayer) textLayer.innerHTML = "";
  if (drawCtx && drawCanvas) {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  }
  selectedBox = null;
}

function initOverlayDrag(div) {
  div.addEventListener("mousedown", (e) => {
    if (currentTool === "select") {
      e.stopPropagation();
      selectBox(div);

      draggingBox = div;
      const rect = div.getBoundingClientRect();
      const parentRect = textLayer.getBoundingClientRect();
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

  initOverlayDrag(div);
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

// Add image overlay (used for drawn or uploaded signatures)
function addImageOverlay(dataUrl) {
  if (!textLayer) return;
  const img = document.createElement("img");
  img.src = dataUrl;
  img.className = "overlay-object";
  img.style.left = "40px";
  img.style.top = "40px";
  img.style.width = "160px";
  img.style.height = "auto";

  initOverlayDrag(img);
  textLayer.appendChild(img);
}

// Typed signature
function addTypedSignature(text, fontFamily) {
  if (!textLayer) return;
  const div = document.createElement("div");
  div.className = "overlay-object";
  div.style.left = "40px";
  div.style.top = "40px";
  div.style.fontFamily = fontFamily;
  div.style.fontSize = "22px";
  div.style.background = "transparent";
  div.style.border = "none";
  div.textContent = text;

  initOverlayDrag(div);
  textLayer.appendChild(div);
}

// ---------- Drawing tools (pen, highlight, rect, eraser) ----------

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
    drawCtx.beginPath();
    drawCtx.moveTo(drawStartX, drawStartY);
  } else if (currentTool === "highlight") {
    if (highlightMode === "brush") {
      drawCtx.strokeStyle = "#fde047";
      drawCtx.lineWidth = 4;
      drawCtx.globalAlpha = 0.25;
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.beginPath();
      drawCtx.moveTo(drawStartX, drawStartY);
    } else {
      // box mode: store preview
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
    drawCtx.lineWidth = 14;
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

function onPointerMove(e) {
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
    if (rectPreviewImg) {
      drawCtx.putImageData(rectPreviewImg, 0, 0);
    }

    if (currentTool === "rect") {
      drawCtx.save();
      drawCtx.setLineDash([6, 4]);
      drawCtx.strokeStyle = "#60a5fa";
      drawCtx.lineWidth = 1;
      drawCtx.strokeRect(drawStartX, drawStartY, w, h);
      drawCtx.restore();
    } else if (currentTool === "highlight" && highlightMode === "box") {
      drawCtx.save();
      drawCtx.fillStyle = "rgba(253, 224, 71, 0.25)"; // soft yellow
      drawCtx.fillRect(drawStartX, drawStartY, w, h);
      drawCtx.restore();
    }
  }
}

function onPointerUp(e) {
  if (!isDrawing) return;
  isDrawing = false;

  if (currentTool === "rect" || (currentTool === "highlight" && highlightMode === "box")) {
    const { x: endX, y: endY } = getCanvasCoords(e, drawCanvas);
    const w = endX - drawStartX;
    const h = endY - drawStartY;

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    if (rectPreviewImg) {
      drawCtx.putImageData(rectPreviewImg, 0, 0);
    }

    if (currentTool === "rect") {
      drawCtx.fillStyle = "#ffffff";
      drawCtx.globalAlpha = 1;
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.fillRect(drawStartX, drawStartY, w, h);
    } else if (currentTool === "highlight" && highlightMode === "box") {
      drawCtx.fillStyle = "rgba(253, 224, 71, 0.25)";
      drawCtx.globalAlpha = 1;
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.fillRect(drawStartX, drawStartY, w, h);
    }
    rectPreviewImg = null;
  }

  drawCtx.globalAlpha = 1;
  drawCtx.globalCompositeOperation = "source-over";
  pushHistory();
}

// ---------- History ----------

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
  textLayer.querySelectorAll(".text-box, .overlay-object").forEach((box) => {
    initOverlayDrag(box);
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

// ---------- Export current page as PDF ----------

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

  // base
  tctx.drawImage(canvas, 0, 0);
  // drawings
  tctx.drawImage(drawCanvas, 0, 0);

  // text + overlay objects
  document
    .querySelectorAll(".text-layer .text-box, .text-layer .overlay-object")
    .forEach((node) => {
      const x = parseFloat(node.style.left) || 0;
      const y = parseFloat(node.style.top) || 0;

      if (node.tagName.toLowerCase() === "img") {
        // signature image
        const img = new Image();
        img.src = node.src;
        const w = node.offsetWidth;
        const h = node.offsetHeight;
        tctx.drawImage(img, x, y, w, h);
      } else {
        // text
        const style = window.getComputedStyle(node);
        const font = style.font || "13px system-ui, sans-serif";
        const color = style.color || "#111827";
        tctx.font = font;
        tctx.fillStyle = color;
        const text = node.innerText;
        tctx.fillText(text, x, y + 14);
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

// ---------- Signature modal helpers ----------

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
