pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const fileInput = document.getElementById("fileInput");
const openBtn = document.getElementById("openBtn");
const openBtnCenter = document.getElementById("openBtnCenter");

const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");

const zoomLabel = document.getElementById("zoomLabel");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const fitBtn = document.getElementById("fitBtn");

let pdfDoc = null;
let scale = 1.2;

/* OPEN PDF */
openBtn.onclick = openFile;
openBtnCenter.onclick = openFile;

function openFile() {
  fileInput.click();
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const bytes = new Uint8Array(await file.arrayBuffer());
  pdfDoc = await pdfjsLib.getDocument(bytes).promise;

  document.body.classList.remove("editor-empty");
  document.body.classList.add("editor-loaded");

  renderPage();
});

/* RENDER */
async function renderPage() {
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  zoomLabel.textContent = Math.round(scale * 100) + "%";
}

/* ZOOM */
zoomInBtn.onclick = () => {
  scale += 0.1;
  renderPage();
};

zoomOutBtn.onclick = () => {
  scale = Math.max(0.4, scale - 0.1);
  renderPage();
};

fitBtn.onclick = () => {
  scale = 1;
  renderPage();
};
