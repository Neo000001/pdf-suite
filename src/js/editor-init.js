// PDFSuit Editor – Stable Consolidated Version
let pdfDoc = null;
let currentPage = 1;
let renderScale = 1.4;

// Canvas & Layer Refs
let canvas, ctx, drawCanvas, drawCtx, overlayLayer, canvasInner, canvasArea;

// State Management
let currentTool = "select";
let highlightMode = "box"; 
let brushSize = 4;
let viewScale = 1;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;

let isDrawing = false;
let drawStartX = 0, drawStartY = 0;
let rectPreviewImg = null;
let currentFontSize = 12;
let currentBold = false;
let currentItalic = false;

// History & Overlays
let history = [];
let historyIndex = -1;
let selectedOverlay = null;
let draggingOverlay = null;
let dragOffsetX = 0, dragOffsetY = 0;
let resizingOverlay = null;
let resizeStartWidth = 0, resizeStartHeight = 0;
let resizeStartX = 0, resizeStartY = 0;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Elements
    canvas = document.getElementById("pdf-canvas");
    ctx = canvas.getContext("2d");
    drawCanvas = document.getElementById("draw-canvas");
    drawCtx = drawCanvas.getContext("2d");
    overlayLayer = document.getElementById("overlay-layer");
    canvasInner = document.getElementById("canvas-inner");
    canvasArea = document.querySelector(".canvas-wrapper");

    const fileInput = document.getElementById("file-input");
    const toolButtons = document.querySelectorAll(".tool-icon-btn");

    // PDF.js worker setup
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

    /* --- EVENT LISTENERS --- */

    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) loadPdfFromFile(file);
    });

    toolButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tool = btn.dataset.tool;
            setTool(tool);
            toolButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });

    // Fix: Using capture phase for drawing to ensure it hits before overlays if necessary
    drawCanvas.addEventListener("mousedown", onDrawDown);
    window.addEventListener("mousemove", (e) => {
        if (isDrawing) onDrawMove(e);
        if (draggingOverlay || resizingOverlay) onOverlayDragMove(e);
    });
    window.addEventListener("mouseup", () => {
        if (isDrawing) onDrawUp();
        if (draggingOverlay || resizingOverlay) {
            draggingOverlay = null;
            resizingOverlay = null;
            pushHistory();
        }
    });

    // Zoom Controls
    document.getElementById("zoom-in-btn").onclick = () => changeZoom(0.15);
    document.getElementById("zoom-out-btn").onclick = () => changeZoom(-0.15);
    document.getElementById("zoom-reset-btn").onclick = fitZoom;
    document.getElementById("undo-btn").onclick = undo;
    document.getElementById("redo-btn").onclick = redo;
    document.getElementById("save-btn").onclick = exportCurrentPageAsPdf;

    // Text Formatting
    document.getElementById("font-size").onchange = (e) => {
        currentFontSize = parseInt(e.target.value);
        if(selectedOverlay?.classList.contains("text-box")) {
            selectedOverlay.style.fontSize = currentFontSize + "px";
            pushHistory();
        }
    };
});

/* --- CORE LOGIC FIXES --- */

// FIX 1: Zoom-Aware Coordinates
// This prevents the "drift" when drawing while zoomed in
function getCanvasCoords(e) {
    const rect = drawCanvas.getBoundingClientRect();
    
    // 1. Get position relative to the visible box on screen
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // 2. Adjust for CSS Scale (the viewScale variable)
    // 3. Adjust for internal resolution vs display size
    const x = (clientX / viewScale) * (drawCanvas.width / (rect.width / viewScale));
    const y = (clientY / viewScale) * (drawCanvas.height / (rect.height / viewScale));

    return { x, y };
}

// FIX 2: Layer Management
function setTool(tool) {
    currentTool = tool;
    const isDrawingTool = ["pen", "highlight", "rect", "eraser"].includes(tool);
    
    // Important: drawing canvas must be 'auto' to draw, 
    // but overlay must be 'none' so it doesn't block the pen.
    drawCanvas.style.pointerEvents = isDrawingTool ? "auto" : "none";
    overlayLayer.style.pointerEvents = (tool === "select" || tool === "text") ? "auto" : "none";
    
    canvasArea.style.cursor = tool === "hand" ? "grab" : "default";
    drawCanvas.style.cursor = isDrawingTool ? "crosshair" : "default";
}

// FIX 3: Undo/Redo without duplicate handles
function pushHistory() {
    if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
    
    // Strip handles before saving to HTML string to prevent "Ghost Handles"
    const tempNode = overlayLayer.cloneNode(true);
    tempNode.querySelectorAll(".resize-handle").forEach(h => h.remove());

    history.push({
        drawData: drawCanvas.toDataURL(),
        overlayHtml: tempNode.innerHTML
    });
    historyIndex++;
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
    // Re-attach handles and logic to restored elements
    overlayLayer.querySelectorAll(".text-box, .overlay-object").forEach(el => {
        addResizeHandle(el);
        el.onmousedown = (e) => {
            if (currentTool === "select") {
                e.stopPropagation();
                startDragOverlay(el, e);
            }
        };
    });
}

/* --- PDF RENDERING --- */

async function renderPage(num) {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: renderScale });

    canvas.width = drawCanvas.width = viewport.width;
    canvas.height = drawCanvas.height = viewport.height;
    overlayLayer.style.width = viewport.width + "px";
    overlayLayer.style.height = viewport.height + "px";

    await page.render({ canvasContext: ctx, viewport }).promise;
    applyViewScale();
}

/* --- DRAWING HANDLERS --- */

function onDrawDown(e) {
    isDrawing = true;
    const { x, y } = getCanvasCoords(e);
    drawStartX = x; drawStartY = y;

    drawCtx.beginPath();
    drawCtx.moveTo(x, y);
    
    if (currentTool === "rect" || (currentTool === "highlight" && highlightMode === "box")) {
        rectPreviewImg = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    }
}

function onDrawMove(e) {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoords(e);

    if (currentTool === "pen" || currentTool === "eraser" || (currentTool === "highlight" && highlightMode === "brush")) {
        drawCtx.globalCompositeOperation = currentTool === "eraser" ? "destination-out" : "source-over";
        drawCtx.strokeStyle = currentTool === "highlight" ? "rgba(253, 224, 71, 0.5)" : "#111827";
        drawCtx.lineWidth = currentTool === "highlight" ? brushSize * 2 : brushSize;
        drawCtx.lineTo(x, y);
        drawCtx.stroke();
    } else if (rectPreviewImg) {
        // Shape preview logic
        drawCtx.putImageData(rectPreviewImg, 0, 0);
        const w = x - drawStartX;
        const h = y - drawStartY;
        if (currentTool === "rect") {
            drawCtx.strokeStyle = "#60a5fa";
            drawCtx.setLineDash([5, 5]);
            drawCtx.strokeRect(drawStartX, drawStartY, w, h);
            drawCtx.setLineDash([]);
        }
    }
}

function onDrawUp() {
    if (!isDrawing) return;
    isDrawing = false;
    pushHistory();
}

/* --- UTILS --- */

function changeZoom(delta) {
    viewScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewScale + delta));
    applyViewScale();
}

function applyViewScale() {
    canvasInner.style.transform = `scale(${viewScale})`;
    canvasInner.style.transformOrigin = "top left";
    // Sync container size to prevent scrolling issues
    canvasInner.style.width = (canvas.width * viewScale) + "px";
    canvasInner.style.height = (canvas.height * viewScale) + "px";
    document.getElementById("zoom-label").textContent = `${Math.round(viewScale * 100)}%`;
}

async function loadPdfFromFile(file) {
    const reader = new FileReader();
    reader.onload = async () => {
        const loadingTask = pdfjsLib.getDocument({ data: reader.result });
        pdfDoc = await loadingTask.promise;
        document.getElementById("empty-state").style.display = "none";
        renderPage(1);
        pushHistory();
    };
    reader.readAsArrayBuffer(file);
}

// Helper: Standard Handle Creation
function addResizeHandle(el) {
    if (el.querySelector(".resize-handle")) return;
    const h = document.createElement("div");
    h.className = "resize-handle";
    h.onmousedown = (e) => {
        e.stopPropagation();
        startResizeOverlay(el, e);
    };
    el.appendChild(h);
}

// ... Rest of your drag/resize logic (startDragOverlay, etc.) remains similar but now uses getCanvasCoords
