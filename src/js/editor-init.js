/**
 * PDFSuit Editor - Consolidated Final Logic
 * Handles PDF rendering, Multi-layer drawing, and UI tools.
 */

// --- Global State ---
let pdfDoc = null;
let currentPage = 1;
let renderScale = 1.5; // Internal resolution
let viewScale = 1;     // Zoom level
let currentTool = "select";

// --- Canvas & Layer Refs ---
let canvas, ctx, drawCanvas, drawCtx, overlayLayer, canvasInner;

// --- Tool State ---
let isDrawing = false;
let brushSize = 4;
let brushColor = "#000000";
let fontSize = 16;
let selectedElement = null;

// --- History ---
let history = [];
let historyIndex = -1;

// --- Initialize PDF.js Worker ---
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Element Assignments
    canvas = document.getElementById("pdf-canvas");
    ctx = canvas.getContext("2d");
    drawCanvas = document.getElementById("draw-canvas");
    drawCtx = drawCanvas.getContext("2d");
    overlayLayer = document.getElementById("overlay-layer");
    canvasInner = document.getElementById("canvas-inner");

    // 2. Tool Button Initialization
    document.querySelectorAll(".tool-icon-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tool-icon-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            setTool(btn.dataset.tool);
        });
    });

    // 3. UI Controls (Size/Font)
    const brushInput = document.getElementById("brush-size");
    if (brushInput) brushInput.oninput = (e) => brushSize = parseInt(e.target.value);

    const fontSelect = document.getElementById("font-size");
    if (fontSelect) fontSelect.onchange = (e) => {
        fontSize = parseInt(e.target.value);
        if (selectedElement && selectedElement.classList.contains("text-box")) {
            selectedElement.style.fontSize = fontSize + "px";
        }
    };

    // 4. Global Mouse Events
    drawCanvas.addEventListener("mousedown", startDrawing);
    window.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDrawing);

    // 5. PDF Loading Event
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) loadPdf(file);
    };

    // 6. Action Buttons
    document.getElementById("save-btn").onclick = exportPDF;
    document.getElementById("undo-btn").onclick = undo;
    document.getElementById("delete-btn").onclick = deleteSelected;

    // 7. Text Insertion (Overlay Layer)
    overlayLayer.addEventListener("click", (e) => {
        if (currentTool === "text" || currentTool === "edit-text") {
            const { x, y } = getCoords(e);
            if (currentTool === "edit-text") {
                // Whiteout effect on draw canvas
                drawCtx.fillStyle = "white";
                drawCtx.fillRect(x, y - (fontSize / 1.5), fontSize * 6, fontSize * 1.5);
            }
            createTextBox(x, y);
        }
    });
});

// --- Core Functions ---

async function loadPdf(file) {
    const reader = new FileReader();
    reader.onload = async function() {
        const typedarray = new Uint8Array(this.result);
        const loadingTask = pdfjsLib.getDocument({ data: typedarray });
        pdfDoc = await loadingTask.promise;
        
        document.getElementById("empty-state").classList.add("hidden");
        document.getElementById("page-label").textContent = `Page 1 / ${pdfDoc.numPages}`;
        renderPage(1);
    };
    reader.readAsArrayBuffer(file);
}

async function renderPage(num) {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: renderScale });

    // Sync dimensions
    canvas.width = drawCanvas.width = viewport.width;
    canvas.height = drawCanvas.height = viewport.height;
    overlayLayer.style.width = viewport.width + "px";
    overlayLayer.style.height = viewport.height + "px";

    await page.render({ canvasContext: ctx, viewport }).promise;
    updateViewScale();
    saveState(); // Initial state
}

function setTool(tool) {
    currentTool = tool;
    const isDrawingTool = ["pen", "highlight", "eraser"].includes(tool);
    
    // Manage Layer Interaction
    drawCanvas.style.pointerEvents = isDrawingTool ? "auto" : "none";
    overlayLayer.style.pointerEvents = isDrawingTool ? "none" : "auto";
    
    // Cursor UI
    document.querySelector(".workspace").style.cursor = isDrawingTool ? "crosshair" : "default";
}

function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) / viewScale,
        y: (e.clientY - rect.top) / viewScale
    };
}

// --- Drawing Logic ---

function startDrawing(e) {
    isDrawing = true;
    const { x, y } = getCoords(e);
    drawCtx.beginPath();
    drawCtx.moveTo(x, y);
    
    // Configure context based on tool
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    
    if (currentTool === "eraser") {
        drawCtx.globalCompositeOperation = "destination-out";
        drawCtx.lineWidth = brushSize * 4;
    } else if (currentTool === "highlight") {
        drawCtx.globalCompositeOperation = "source-over";
        drawCtx.strokeStyle = "rgba(255, 255, 0, 0.4)";
        drawCtx.lineWidth = brushSize * 5;
    } else {
        drawCtx.globalCompositeOperation = "source-over";
        drawCtx.strokeStyle = brushColor;
        drawCtx.lineWidth = brushSize;
    }
}

function draw(e) {
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    drawCtx.lineTo(x, y);
    drawCtx.stroke();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        saveState();
    }
}

// --- Text Management ---

function createTextBox(x, y) {
    const box = document.createElement("div");
    box.className = "text-box";
    box.contentEditable = true;
    box.style.left = x + "px";
    box.style.top = y + "px";
    box.style.fontSize = fontSize + "px";
    box.innerText = "Type text...";

    box.onmousedown = (e) => {
        if (currentTool === "select") {
            e.stopPropagation();
            selectElement(box);
        }
    };
    
    overlayLayer.appendChild(box);
    box.focus();
    saveState();
}

function selectElement(el) {
    if (selectedElement) selectedElement.classList.remove("selected");
    selectedElement = el;
    selectedElement.classList.add("selected");
}

function deleteSelected() {
    if (selectedElement) {
        selectedElement.remove();
        selectedElement = null;
        saveState();
    }
}

// --- Utilities ---

function updateViewScale() {
    canvasInner.style.transform = `scale(${viewScale})`;
    canvasInner.style.width = (canvas.width * viewScale) + "px";
    canvasInner.style.height = (canvas.height * viewScale) + "px";
}

function saveState() {
    history = history.slice(0, historyIndex + 1);
    history.push({
        draw: drawCanvas.toDataURL(),
        html: overlayLayer.innerHTML
    });
    historyIndex++;
}

function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    const state = history[historyIndex];
    
    // Restore Drawing
    const img = new Image();
    img.src = state.draw;
    img.onload = () => {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        drawCtx.drawImage(img, 0, 0);
    };
    
    // Restore Text
    overlayLayer.innerHTML = state.html;
    // Re-bind click events to restored boxes
    overlayLayer.querySelectorAll('.text-box').forEach(box => {
        box.onmousedown = (e) => { if(currentTool === 'select') { e.stopPropagation(); selectElement(box); } };
    });
}

// --- Export ---

async function exportPDF() {
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const fCtx = finalCanvas.getContext("2d");

    // Flatten Layers
    fCtx.drawImage(canvas, 0, 0);
    fCtx.drawImage(drawCanvas, 0, 0);
    
    // Draw Text onto Canvas
    overlayLayer.querySelectorAll(".text-box").forEach(box => {
        fCtx.font = `${box.style.fontSize} Arial`;
        fCtx.fillStyle = "black";
        fCtx.fillText(box.innerText, parseInt(box.style.left), parseInt(box.style.top) + parseInt(box.style.fontSize));
    });

    const pdfLibDoc = await PDFLib.PDFDocument.create();
    const page = pdfLibDoc.addPage([canvas.width, canvas.height]);
    const img = await pdfLibDoc.embedPng(finalCanvas.toDataURL("image/png"));
    
    page.drawImage(img, { x: 0, y: 0, width: canvas.width, height: canvas.height });
    const bytes = await pdfLibDoc.save();
    
    const blob = new Blob([bytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "edited_suit.pdf";
    link.click();
}
