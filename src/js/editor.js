const pdfCanvas = document.getElementById("pdfCanvas");
const drawCanvas = document.getElementById("drawCanvas");
const ctx = pdfCanvas.getContext("2d");

const fileInput = document.getElementById("fileInput");
const openBtns = [document.getElementById("openBtn"), document.getElementById("openBtnCenter")];

const zoomLabel = document.getElementById("zoomLabel");

let pdfDoc = null;
let scale = 1.0;

/* PDF.JS WORKER (MATCH VERSION) */
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

/* OPEN BUTTONS */
openBtns.forEach(btn => {
  btn.onclick = () => fileInput.click();
});

fileInput.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  loadPdf(file);
};

/* LOAD PDF */
async function loadPdf(file) {
  const data = await file.arrayBuffer();

  pdfDoc = await pdfjsLib.getDocument({ data }).promise;

  document.body.classList.remove("editor-empty");

  renderPage();
}

/* RENDER PAGE 1 */
async function renderPage() {
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale });

  pdfCanvas.width = viewport.width;
  pdfCanvas.height = viewport.height;

  drawCanvas.width = viewport.width;
  drawCanvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  updateZoom();
}

/* ZOOM */
document.getElementById("zoomIn").onclick = () => {
  scale += 0.1;
  renderPage();
};

document.getElementById("zoomOut").onclick = () => {
  scale = Math.max(0.4, scale - 0.1);
  renderPage();
};

document.getElementById("fitBtn").onclick = () => {
  const wrap = document.getElementById("canvasWrapper");
  scale = (wrap.clientWidth - 40) / pdfCanvas.width;
  renderPage();
};

function updateZoom() {
  zoomLabel.textContent = Math.round(scale * 100) + "%";
}

/* SAVE PAGE AS PDF */
document.getElementById("saveBtn").onclick = async () => {
  const temp = document.createElement("canvas");
  temp.width = pdfCanvas.width;
  temp.height = pdfCanvas.height;

  const tctx = temp.getContext("2d");
  tctx.drawImage(pdfCanvas, 0, 0);
  tctx.drawImage(drawCanvas, 0, 0);

  const pdf = await PDFLib.PDFDocument.create();
  const page = pdf.addPage([temp.width, temp.height]);
  const img = await pdf.embedPng(temp.toDataURL());

  page.drawImage(img, { x: 0, y: 0, width: temp.width, height: temp.height });

  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: "application/pdf" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "edited.pdf";
  a.click();
};
