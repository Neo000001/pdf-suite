//-----------------------------------------------------
// PDF ENGINE — using PDF.js (runs fully client-side)
//-----------------------------------------------------

let pdfDoc = null;
let currentPage = 1;
let scale = 1.2;
const canvas = document.getElementById("pdf-canvas");
const ctx = canvas.getContext("2d");

// Load PDF file
document.getElementById("file-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const fileReader = new FileReader();
  fileReader.onload = function () {
    const typedarray = new Uint8Array(this.result);
    loadPDF(typedarray);
  };
  fileReader.readAsArrayBuffer(file);
});

async function loadPDF(data) {
  pdfjsLib.getDocument(data).promise.then((doc) => {
    pdfDoc = doc;
    renderPage(1);
  });
}

// Render page onto canvas
async function renderPage(num) {
  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale: scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport: viewport }).promise;
}

// Zoom functions, navigation, tools — expanding next

//-----------------------------------------------------

console.log("PDF Editor Ready");
