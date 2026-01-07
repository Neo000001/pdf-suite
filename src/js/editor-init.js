// PDFSuit Editor - Full Tool Support Logic
let pdfDoc = null;
let renderScale = 1.5;
let viewScale = 1;
let currentTool = "select";

// Refs
let canvas, ctx, drawCanvas, drawCtx, overlayLayer;

// Settings State
let brushSize = 4;
let brushColor = "#000000";
let fontSize = 16;
let currentFont = "Arial";

document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("pdf-canvas");
    ctx = canvas.getContext("2d");
    drawCanvas = document.getElementById("draw-canvas");
    drawCtx = drawCanvas.getContext("2d");
    overlayLayer = document.getElementById("overlay-layer");

    // --- 1. CONNECT UI INPUTS ---
    
    // Brush Size Slider
    const brushInput = document.getElementById("brush-size");
    if (brushInput) {
        brushInput.addEventListener("input", (e) => {
            brushSize = parseInt(e.target.value);
        });
    }

    // Font Size Select
    const fontSelect = document.getElementById("font-size");
    if (fontSelect) {
        fontSelect.addEventListener("change", (e) => {
            fontSize = parseInt(e.target.value);
            if (selectedElement) selectedElement.style.fontSize = fontSize + "px";
        });
    }

    // --- 2. TOOL SELECTION ---
    document.querySelectorAll(".tool-icon-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tool-icon-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentTool = btn.dataset.tool;
            
            // Pointer management: If drawing, disable overlay so clicks hit the canvas
            const isDrawing = ["pen", "highlight", "eraser"].includes(currentTool);
            drawCanvas.style.pointerEvents = isDrawing ? "auto" : "none";
            overlayLayer.style.pointerEvents = isDrawing ? "none" : "auto";
        });
    });

    // --- 3. DRAWING & ERASING LOGIC ---
    let isDrawing = false;
    drawCanvas.addEventListener("mousedown", (e) => {
        isDrawing = true;
        const { x, y } = getCoords(e);
        drawCtx.beginPath();
        drawCtx.moveTo(x, y);
        
        // Dynamic Brush Settings
        drawCtx.lineCap = "round";
        drawCtx.lineJoin = "round";
        
        if (currentTool === "eraser") {
            drawCtx.globalCompositeOperation = "destination-out";
            drawCtx.lineWidth = brushSize * 5; // Eraser is usually bigger
        } else if (currentTool === "highlight") {
            drawCtx.globalCompositeOperation = "source-over";
            drawCtx.strokeStyle = "rgba(255, 255, 0, 0.4)";
            drawCtx.lineWidth = brushSize * 4;
        } else {
            drawCtx.globalCompositeOperation = "source-over";
            drawCtx.strokeStyle = brushColor;
            drawCtx.lineWidth = brushSize;
        }
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDrawing || !["pen", "highlight", "eraser"].includes(currentTool)) return;
        const { x, y } = getCoords(e);
        drawCtx.lineTo(x, y);
        drawCtx.stroke();
    });

    window.addEventListener("mouseup", () => isDrawing = false);

    // --- 4. TEXT & EDIT TEXT LOGIC ---
    overlayLayer.addEventListener("click", (e) => {
        if (currentTool === "text" || currentTool === "edit-text") {
            const { x, y } = getCoords(e);
            
            if (currentTool === "edit-text") {
                // ERASE THE PDF TEXT: Draw a white rectangle on the DRAW canvas
                drawCtx.globalCompositeOperation = "source-over";
                drawCtx.fillStyle = "white";
                // Estimate size based on font
                drawCtx.fillRect(x, y - (fontSize/2), fontSize * 5, fontSize * 1.2);
            }
            
            createTextBox(x, y);
        }
    });
});

// --- HELPERS ---

function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    // Account for zoom (viewScale)
    return {
        x: (e.clientX - rect.left) / viewScale,
        y: (e.clientY - rect.top) / viewScale
    };
}

function createTextBox(x, y) {
    const box = document.createElement("div");
    box.className = "text-box";
    box.contentEditable = true;
    box.style.left = x + "px";
    box.style.top = y + "px";
    box.style.fontSize = fontSize + "px";
    box.style.fontFamily = currentFont;
    box.innerText = "Type here...";
    
    box.addEventListener("mousedown", (e) => {
        if (currentTool === "select") {
            e.stopPropagation();
            selectElement(box);
        }
    });
    
    overlayLayer.appendChild(box);
    box.focus();
}

let selectedElement = null;
function selectElement(el) {
    if (selectedElement) selectedElement.style.border = "none";
    selectedElement = el;
    selectedElement.style.border = "1px dashed blue";
}
