// PDFSuit Editor – stable version
// - Open one PDF
// - Zoom + hand pan
// - Pen, highlighter (box + brush), white rect, eraser
// - Add text boxes with formatting (size / bold / italic)
// - Edit Text tool = white-out + new text box
// - Signatures: draw / upload / typed, draggable + resizable
// - Undo / Redo
// - Export current page as PDF (flattened image)

let pdfDoc = null;
let currentPage = 1;
let renderScale = 1.4;

// canvas refs
let canvas, ctx;
let drawCanvas, drawCtx;
let overlayLayer;
let canvasInner, canvasArea;
let pageLabel;

// tool state
let currentTool = "select";
let highlightMode = "box"; // "box" | "brush"
let brushSize = 4;

let currentFontSize = 12;
let currentBold = false;
let currentItalic = false;

// drawing state
let isDrawing = false;
let drawStartX = 0;
let drawStartY = 0;
let rectPreviewImg = null;

// overlay drag / resize
let selectedOverlay = null;
let draggingOverlay = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let resizingOverlay = null;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let resizeStartX = 0;
let resizeStartY = 0;

// zoom & pan
let viewScale = 1;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;
let isPanning = false;
let panStartX = 0,
  panStartY = 0,
  panScrollLeft = 0,
  panScrollTop = 0;

// history
let history = [];
let historyIndex = -1;

// signature modal
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
  pageLabel = document.getElementById("page-label");

  const fileInput = document.getElementById("file-input");
  const toolButtons = document.querySelectorAll(".tool-icon-btn");
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");
  const deleteBtn = document.getElementById("delete-btn");
  const saveBtn = document.getElementById("save-btn");

  const zoomInBtn = document.getElementById("zoom-in-btn");
  const zoomOutBtn = document.getElementById("zoom-out-btn");
  const zoomResetBtn = document.getElementById("zoom-reset-btn");

  const fontSizeSelect = document.getElementById("font-size");
  const boldBtn = document.getElementById("bold-btn");
  const italicBtn = document.getElementById("italic-btn");
  const brushSizeInput = document.getElementById("brush-size");

  const hlBoxBtn = document.getElementById("hl-mode-box");
  const hlBrushBtn = document.getElementById("hl-mode-brush");

  // signature modal refs
  sigModal = document.getElementById("signature-modal");
  sigDrawCanvas = document.getElementById("sig-draw-canvas");
  if (sigDrawCanvas) {
    sigDrawCtx = sigDrawCanvas.getContext("2d");
  }

  // PDF.js worker
  if (!window.pdfjsLib) {
    alert("PDF engine failed to load.");
    return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

  /* ---------- OPEN PDF (button only, no drag-drop) ---------- */

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please choose a PDF file.");
      return;
    }
    loadPdfFromFile(file);
  });

  /* ---------- TOOLBAR ---------- */

  toolButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool;
      if (tool === "signature") {
        openSignatureModal();
        return;
      }
      setTool(tool);
      toolButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  /* ---------- CANVAS CLICK (text & edit-text) ---------- */

  canvas.addEventListener("click", (e) => {
    if (!pdfDoc) return;
    const { x, y } = getCanvasCoords(e, canvas);

    if (currentTool === "text") {
      const box = createTextBox(x, y);
      focusTextBox(box);
      pushHistory();
    } else if (currentTool === "edit-text") {
      const rectWidth = 220;
      const rectHeight = currentFontSize * 1.6;
      drawCtx.fillStyle = "#ffffff";
      drawCtx.globalAlpha = 1;
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.fillRect(x, y, rectWidth, rectHeight);

      const box = createTextBox(x, y, rectWidth, rectHeight);
      box.textContent = "Edit text…";
      focusTextBox(box);
      pushHistory();
    }
  });

  /* ---------- DRAWING LAYER (pen / highlight / rect / eraser) ---------- */

  drawCanvas.addEventListener("mousedown", onDrawDown);
  drawCanvas.addEventListener("mousemove", onDrawMove);
  drawCanvas.addEventListener("mouseup", onDrawUp);
  drawCanvas.addEventListener("mouseleave", onDrawUp);

  /* ---------- OVERLAY DRAG / RESIZE (global mousemove) ---------- */

  document.addEventListener("mousemove", onOverlayDragMove);
  document.addEventListener("mouseup", () => {
    if (draggingOverlay || resizingOverlay) {
      draggingOverlay = null;
      resizingOverlay = null;
      document.body.style.userSelect = "";
      pushHistory();
    }
  });

  // Delete key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" && selectedOverlay) {
      selectedOverlay.remove();
      selectedOverlay = null;
      pushHistory();
    }
  });

  /* ---------- Undo / Redo / Delete / Save ---------- */

  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);

  deleteBtn.addEventListener("click", () => {
    if (selectedOverlay) {
      selectedOverlay.remove();
      selectedOverlay = null;
      pushHistory();
    } else {
      alert("Select a text box or signature first (Select tool).");
    }
  });

  saveBtn.addEventListener("click", exportCurrentPageAsPdf);

  /* ---------- Zoom & Hand Pan ---------- */

  zoomInBtn.addEventListener("click", () => changeZoom(0.15));
  zoomOutBtn.addEventListener("click", () => changeZoom(-0.15));
  zoomResetBtn.addEventListener("click", fitZoom);

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

  /* ---------- Text formatting controls ---------- */

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

  /* ---------- Brush size & highlight mode ---------- */

  brushSizeInput.addEventListener("input", () => {
    brushSize = parseInt(brushSizeInput.value, 10) || 4;
  });

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

  /* ---------- Signature canvas & modal ---------- */

  if (sigDrawCanvas) {
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
  }

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

  if (sigClearBtn && sigSaveBtn && sigCloseBtn) {
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
  }

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

      // footer buttons visibility
      const isDraw = name === "draw";
      const isUpload = name === "upload";
      const isType = name === "type";
      if (sigSaveBtn) sigSaveBtn.classList.toggle("hidden", !isDraw);
      if (sigUploadSaveBtn)
        sigUploadSaveBtn.classList.toggle("hidden", !isUpload);
      if (sigTypeSaveBtn)
        sigTypeSaveBtn.classList.toggle("hidden", !isType);
    });
  });

  if (sigUploadSaveBtn) {
    sigUploadSaveBtn.addEventListener("click", () => {
      const file = sigUploadInput.files && sigUploadInput.files[0];
      if (!file) {
        alert("Choose a signature image first.");
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
  }

  if (sigTypeSaveBtn) {
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
  }

  window.addEventListener("resize", resizeSignatureCanvas);

  // initialise zoom label
  updateZoomLabel();
});

/* ---------- PDF loading & rendering ---------- */

async function loadPdfFromFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  pdfjsLib
    .getDocument({ data: uint8Array })
    .promise.then(async (doc) => {
      pdfDoc = doc;
      currentPage = 1;
      await renderPage(currentPage);
      clearOverlays();
      resetHistory();
      pushHistory();
      fitZoom();
    })
    .catch((err) => {
      console.error("PDF open error:", err);
      // no alert – if it opens, we don't annoy the user
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
  overlayLayer.style.pointerEvents = "auto";

  canvas.style.display = "block";
  drawCanvas.style.display = "block";

  const renderContext = {
    canvasContext: ctx,
    viewport,
  };
  await page.render(renderContext).promise;

  updatePageLabel();
  applyViewScale();
}

function updatePageLabel() {
  if (!pageLabel || !pdfDoc) return;
  pageLabel.textContent = `Page ${currentPage} / ${pdfDoc.numPages}`;
}

/* ---------- Zoom ---------- */

function updateZoomLabel() {
  const label = document.getElementById("zoom-label");
  if (label) label.textContent = `${Math.round(viewScale * 100)}%`;
}

function applyViewScale() {
  if (!canvas || !canvasInner || !canvasArea) return;
  const scaledW = Math.round(canvas.width * viewScale);
  const scaledH = Math.round(canvas.height * viewScale);

  canvasInner.style.transformOrigin = "top left";
  canvasInner.style.transform = `scale(${viewScale})`;
  canvasInner.style.width = scaledW + "px";
  canvasInner.style.height = scaledH + "px";

  updateZoomLabel();
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

/* ---------- Tool switching ---------- */

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
}

/* ---------- Text boxes & overlays ---------- */

function createTextBox(x, y, width = 140, height = 24) {
  const box = document.createElement("div");
  box.className = "text-box";
  box.contentEditable = "true";
  box.textContent = "Edit text…";

  box.style.left = x + "px";
  box.style.top = y + "px";
  box.style.fontSize = currentFontSize + "px";
  box.style.fontWeight = currentBold ? "700" : "400";
  box.style.fontStyle = currentItalic ? "italic" : "normal";
  box.style.width = width + "px";
  box.style.height = height + "px";

  box.style.pointerEvents = "auto";

  box.addEventListener("mousedown", (e) => {
    if (currentTool !== "select") return;
    e.stopPropagation();
    startDragOverlay(box, e);
  });

  overlayLayer.appendChild(box);
  addResizeHandle(box);
  return box;
}

function addResizeHandle(el) {
  const handle = document.createElement("div");
  handle.className = "resize-handle";
  handle.style.position = "absolute";
  handle.style.right = "-6px";
  handle.style.bottom = "-6px";
  handle.style.width = "10px";
  handle.style.height = "10px";
  handle.style.borderRadius = "999px";
  handle.style.background = "#60a5fa";
  handle.style.cursor = "nwse-resize";
  handle.style.pointerEvents = "auto";

  handle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    startResizeOverlay(el, e);
  });

  el.appendChild(handle);
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

// drag overlay
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
  if (draggingOverlay) {
    const parentRect = overlayLayer.getBoundingClientRect();
    const x = e.clientX - parentRect.left - dragOffsetX;
    const y = e.clientY - parentRect.top - dragOffsetY;
    draggingOverlay.style.left = x + "px";
    draggingOverlay.style.top = y + "px";
  } else if (resizingOverlay) {
    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;
    const newW = Math.max(40, resizeStartWidth + dx);
    const newH = Math.max(24, resizeStartHeight + dy);
    resizingOverlay.style.width = newW + "px";
    resizingOverlay.style.height = newH + "px";
  }
}

function startResizeOverlay(el, e) {
  resizingOverlay = el;
  const rect = el.getBoundingClientRect();
  resizeStartWidth = rect.width;
  resizeStartHeight = rect.height;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  document.body.style.userSelect = "none";
}

function addImageOverlay(dataUrl) {
  const wrapper = document.createElement("div");
  wrapper.className = "overlay-object";
  wrapper.style.left = "40px";
  wrapper.style.top = "40px";
  wrapper.style.width = "160px";
  wrapper.style.height = "auto";
  wrapper.style.pointerEvents = "auto";

  const img = document.createElement("img");
  img.src = dataUrl;
  img.style.width = "100%";
  img.style.height = "auto";
  wrapper.appendChild(img);

  wrapper.addEventListener("mousedown", (e) => {
    if (currentTool !== "select") return;
    e.stopPropagation();
    startDragOverlay(wrapper, e);
  });

  overlayLayer.appendChild(wrapper);
  addResizeHandle(wrapper);
}

function addTypedSignature(text, fontFamily) {
  const wrapper = document.createElement("div");
  wrapper.className = "overlay-object";
  wrapper.style.left = "40px";
  wrapper.style.top = "40px";
  wrapper.style.width = "200px";
  wrapper.style.height = "40px";
  wrapper.style.background = "transparent";
  wrapper.style.border = "none";
  wrapper.style.pointerEvents = "auto";

  wrapper.style.fontFamily = fontFamily;
  wrapper.style.fontSize = "22px";
  wrapper.style.color = "#111827";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "flex-end";

  wrapper.textContent = text;

  wrapper.addEventListener("mousedown", (e) => {
    if (currentTool !== "select") return;
    e.stopPropagation();
    startDragOverlay(wrapper, e);
  });

  overlayLayer.appendChild(wrapper);
  addResizeHandle(wrapper);
}

/* ---------- Drawing tools ---------- */

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
    drawCtx.moveTo(x, y);
  } else if (currentTool === "highlight") {
    if (highlightMode === "brush") {
      drawCtx.strokeStyle = "#fde047";
      drawCtx.lineWidth = brushSize * 1.5;
      drawCtx.globalAlpha = 0.25;
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.beginPath();
      drawCtx.moveTo(x, y);
    } else {
      drawCtx.globalAlpha = 1;
      drawCtx.globalCompositeOperation = "source-over";
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
    drawCtx.moveTo(x, y);
  } else if (currentTool === "rect") {
    drawCtx.globalAlpha = 1;
    drawCtx.globalCompositeOperation = "source-over";
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
      const height = Math.max(9, Math.min(Math.abs(h), 18));
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
      const height = Math.max(9, Math.min(Math.abs(h), 18));
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

/* ---------- History ---------- */

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
    .forEach((el) => addResizeHandle(el));
  selectedOverlay = null;
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

/* ---------- Export current page as PDF ---------- */

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

  tctx.drawImage(canvas, 0, 0);
  tctx.drawImage(drawCanvas, 0, 0);

  overlayLayer
    .querySelectorAll(".text-box, .overlay-object")
    .forEach((node) => {
      const rect = node.getBoundingClientRect();
      const parentRect = overlayLayer.getBoundingClientRect();
      const x = rect.left - parentRect.left;
      const y = rect.top - parentRect.top;

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
          const fontSize = parseInt(style.fontSize, 10) || 16;
          tctx.font = font;
          tctx.fillStyle = color;
          tctx.fillText(node.innerText, x, y + fontSize);
        }
      } else if (node.classList.contains("text-box")) {
        const style = window.getComputedStyle(node);
        const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const color = style.color || "#111827";
        const fontSize = parseInt(style.fontSize, 10) || 14;
        tctx.font = font;
        tctx.fillStyle = color;
        tctx.fillText(node.innerText, x, y + fontSize);
      }
    });

  const dataUrl = tempCanvas.toDataURL("image/png");
  const out = await PDFLib.PDFDocument.create();
  const page = out.addPage([canvas.width, canvas.height]);
  const img = await out.embedPng(dataUrl);
  page.drawImage(img, {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
  });

  const bytes = await out.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "edited-page.pdf";
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Signature modal helpers ---------- */

function openSignatureModal() {
  if (!sigModal) return;
  sigModal.classList.remove("hidden");
  if (sigDrawCtx && sigDrawCanvas) {
    sigDrawCtx.clearRect(0, 0, sigDrawCanvas.width, sigDrawCanvas.height);
  }
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
}

/* ---------- Utils ---------- */

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

function clearOverlays() {
  overlayLayer.innerHTML = "";
}
