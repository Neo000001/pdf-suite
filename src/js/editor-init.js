let pdfDoc = null;
let currentPage = 1;
let renderScale = 1.5;
let viewScale = 1;
let currentTool = "select";

// Canvas Refs
let canvas, ctx, drawCanvas, drawCtx, overlayLayer, canvasInner, canvasArea;

// History
let history = [];
let historyIndex = -1;

// State
let isDrawing = false;
let drawStartX = 0, drawStartY = 0;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Element Mapping
    canvas = document.getElementById("pdf-canvas");
    ctx = canvas.getContext("2d");
    drawCanvas = document.getElementById("draw-canvas");
    drawCtx = drawCanvas.getContext("2d");
    overlayLayer = document.getElementById("overlay-layer");
    canvasInner = document.getElementById("canvas-inner");
    canvasArea = document.querySelector(".canvas-wrapper");

    // 2. Tool Buttons Logic
    document.querySelectorAll(".tool-icon-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tool-icon-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            setTool(btn.dataset.tool);
        });
    });

    // 3. Drawing Events
    drawCanvas.addEventListener("mousedown", startDrawing);
    window.addEventListener("mousemove", (e) => {
        if (isDrawing) draw(e);
    });
    window.addEventListener("mouseup", stopDrawing);

    // 4. File Input
    document.getElementById("file-input").onchange = (e) => {
        const file = e.target.files[0];
        if (file) loadPdf(file);
    };

    // 5. Actions
    document.getElementById("zoom-in-btn").onclick = () => { viewScale += 0.1; updateView(); };
    document.getElementById("zoom-out-btn").onclick = () => { viewScale -= 0.1; updateView(); };
    document.getElementById("save-btn").onclick = exportPDF;

    // PDF.js Worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
});

function setTool(tool) {
    currentTool = tool;
    const isDraw = ["pen", "highlight", "eraser"].includes(tool);
    
    // Switch interaction layers
    drawCanvas.style.pointerEvents = isDraw ? "auto" : "none";
    overlayLayer.style.pointerEvents = isDraw ? "none" : "auto";
    
    // Update cursor
    canvasArea.style.cursor = isDraw ? "crosshair" : (tool === 'hand' ? 'grab' : 'default');
}

function getCoords(e) {
    const rect = drawCanvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) / viewScale * (drawCanvas.width / (rect.width / viewScale)),
        y: (e.clientY - rect.top) / viewScale * (drawCanvas.height / (rect.height / viewScale))
    };
}

function startDrawing(e) {
    isDrawing = true;
    const { x, y } = getCoords(e);
    drawCtx.beginPath();
    drawCtx.moveTo(x, y);
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
}

function draw(e) {
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    
    drawCtx.globalCompositeOperation = currentTool === "eraser" ? "destination-out" : "source-over";
    drawCtx.strokeStyle = currentTool === "highlight" ? "rgba(255, 255, 0, 0.5)" : "#000000";
    drawCtx.lineWidth = currentTool === "highlight" ? 20 : 3;
    
    drawCtx.lineTo(x, y);
    drawCtx.stroke();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        pushHistory();
    }
}

async function loadPdf(file) {
    const data = await file.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data }).promise;
    document.getElementById("empty-state").style.display = "none";
    renderPage(1);
}

async function renderPage(num) {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: renderScale });
    
    canvas.width = drawCanvas.width = viewport.width;
    canvas.height = drawCanvas.height = viewport.height;
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    updateView();
}

function updateView() {
    canvasInner.style.transform = `scale(${viewScale})`;
    canvasInner.style.width = (canvas.width * viewScale) + "px";
    canvasInner.style.height = (canvas.height * viewScale) + "px";
}

async function exportPDF() {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const eCtx = exportCanvas.getContext("2d");

    eCtx.drawImage(canvas, 0, 0);
    eCtx.drawImage(drawCanvas, 0, 0);

    const pdfDataUri = exportCanvas.toDataURL("image/png");
    const pdfLibDoc = await PDFLib.PDFDocument.create();
    const page = pdfLibDoc.addPage([canvas.width, canvas.height]);
    const img = await pdfLibDoc.embedPng(pdfDataUri);

    page.drawImage(img, { x: 0, y: 0, width: canvas.width, height: canvas.height });
    const bytes = await pdfLibDoc.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "edited.pdf";
    link.click();
}

function pushHistory() {
    // Basic history logic
    history.push(drawCanvas.toDataURL());
    historyIndex++;
}
