const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const PDFDocument = require('pdfkit');
const unzipper = require('unzipper');
const os = require('os');

const app = express();
const port = 3000;

// Set up multer for file uploads
const upload = multer({ dest: os.tmpdir() });

// Serve static files (for the HTML UI)
app.use(express.static(path.join(__dirname, 'public')));

// Main conversion function (adapted from your script)
async function convertH5PtoPDF(h5pFilePath, outputPDFPath) {
  const extractDir = path.join(os.tmpdir(), 'temp_h5p_' + Date.now());

  await fs.ensureDir(extractDir);
  await fs.emptyDir(extractDir);

  // unzip .h5p (it's a zip) directly into extractDir
  await fs.createReadStream(h5pFilePath).pipe(unzipper.Extract({ path: extractDir })).promise();

  // helper to resolve actual asset paths referenced in JSON
  async function findAsset(rel) {
    if (!rel || typeof rel !== "string") return null;
    const candidates = [
      path.join(extractDir, rel),
      path.join(extractDir, "content", rel),
      path.join(extractDir, path.basename(rel)),
      path.join(extractDir, "content", "images", path.basename(rel)),
      path.join(extractDir, "images", path.basename(rel)),
    ];
    for (const c of candidates) if (await fs.pathExists(c)) return c;
    return null;
  }

  // heuristics: what strings are "meaningful" content (not metadata)
  function isMeaningfulText(s) {
    if (typeof s !== "string") return false;
    const t = s.trim();
    if (!t) return false;
    if (/^H5P\./i.test(t)) return false;
    if (/^image\/|^application\/|^text\//i.test(t)) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return false;
    if (/^[A-Z_]{1,10}$/.test(t)) return false;
    if (!/[A-Za-z]/.test(t)) return false;
    return true;
  }

  function stripHTML(str) {
    return str.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  }

  // Create PDF
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 50, bottom: 70, left: 50, right: 50 },
    bufferPages: true
  });
  const pdfStream = fs.createWriteStream(outputPDFPath);
  doc.pipe(pdfStream);
  
  // Removed the first page with "Extracted H5P Content"

  const embeddedImages = new Set();
  function addImageToPDF(imgPath) {
    try {
      doc.image(imgPath, {
        fit: [doc.page.width - doc.page.margins.left - doc.page.margins.right, 400],
        align: "center",
      });
      doc.moveDown(1);
      embeddedImages.add(path.resolve(imgPath));
    } catch (e) {
      console.warn("Couldn't embed image:", imgPath, e.message);
    }
  }

  // recursive parser that prints text and embeds images (skips metadata)
  async function parseContent(obj) {
    if (obj == null) return;

    if (typeof obj === "string") {
      if (/\.(png|jpe?g|gif|svg)$/i.test(obj) || /^images?\//i.test(obj)) {
        const found = await findAsset(obj);
        if (found) { addImageToPDF(found); return; }
      }
      const cleaned = stripHTML(obj);
      if (isMeaningfulText(cleaned)) {
        doc.fontSize(12).text(cleaned);
        doc.moveDown(0.25);
      }
      return;
    }

    if (Array.isArray(obj)) {
      // arrays may be lists of objects (choices etc.)
      for (const item of obj) await parseContent(item);
      return;
    }

    if (typeof obj === "object") {
      // print common textual keys first, in order
      const orderedKeys = ["title","name","label","question","text","body","prompt","description","alt","subtitle","summary"];
      for (const k of orderedKeys) if (obj[k]) await parseContent(obj[k]);

      // handle choices/answers/options nicely
      const choicesArr = obj.choices || obj.answers || obj.options;
      if (Array.isArray(choicesArr) && choicesArr.length) {
        doc.moveDown(0.2);
        for (let i = 0; i < choicesArr.length; i++) {
          const it = choicesArr[i];
          let label = "";
          if (typeof it === "string") label = it;
          else if (it.text) label = it.text;
          else if (it.title) label = it.title;
          else if (it.label) label = it.label;
          const cleaned = stripHTML(label);
          if (isMeaningfulText(cleaned)) doc.fontSize(12).text(`${String.fromCharCode(65 + i)}) ${cleaned}`);
          await parseContent(it);
        }
        doc.moveDown(0.3);
      }

      // descend other keys but skip known metadata keys
      for (const key of Object.keys(obj)) {
        if (["library","mime","type","subContent","files","params","metadata"].includes(key)) continue;
        if (orderedKeys.includes(key)) continue; // already done
        await parseContent(obj[key]);
      }

      // also embed images that appear as object fields like 'path' or 'file'
      if (obj.path && /\.(png|jpe?g|gif|svg)$/i.test(obj.path)) {
        const f = await findAsset(obj.path); if (f) addImageToPDF(f);
      }
      if (obj.file && /\.(png|jpe?g|gif|svg)$/i.test(obj.file)) {
        const f = await findAsset(obj.file); if (f) addImageToPDF(f);
      }
      return;
    }
  }

  async function parseCoursePresentation(params, doc, findAsset) {
    const presentation = params.presentation;
    if (!presentation || !Array.isArray(presentation.slides)) return;

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margins = doc.page.margins;
    const contentW = pageWidth - margins.left - margins.right;
    const contentH = pageHeight - margins.top - margins.bottom;

    let slideIndex = 0;
    for (const slide of presentation.slides) {
      if (slideIndex > 0) doc.addPage();

      // Slide title if present
      if (slide.title) {
        const titleText = stripHTML(slide.title);
        if (titleText) {
          doc.fontSize(16).text(titleText, margins.left, margins.top);
          doc.moveDown(0.5);
        }
      }

      const elements = slide.elements || [];
      for (const elem of elements) {
        if (!elem.action) continue;

        const libFull = elem.action.library;
        const lib = libFull ? libFull.split(' ')[0] : '';
        const libParams = elem.action.params || {};

        const left = margins.left + (elem.x / 100) * contentW;
        const top = margins.top + (elem.y / 100) * contentH;
        const w = (elem.width / 100) * contentW;
        const h = (elem.height / 100) * contentH;

        if (lib === 'H5P.AdvancedText' || lib === 'H5P.Text') {
          let text = stripHTML(libParams.text || '');
          if (text) {
            doc.fontSize(12).text(text, left, top, { width: w, height: h, align: 'left' });
          }
        } else if (lib === 'H5P.Image') {
          const filePath = libParams.file ? libParams.file.path : null;
          const found = await findAsset(filePath);
          if (found) {
            try {
              doc.image(found, left, top, { fit: [w, h], align: 'center', valign: 'center' });
              embeddedImages.add(path.resolve(found));
            } catch (e) {
              console.warn("Couldn't embed image:", found, e.message);
            }
          }
        } else {
          // For other libraries, extract and render basic text content at position
          let textContent = '';
          if (libParams.text) textContent += stripHTML(libParams.text) + '\n';
          if (libParams.question) textContent += stripHTML(libParams.question) + '\n';
          if (Array.isArray(libParams.choices)) {
            libParams.choices.forEach((choice, i) => {
              const choiceText = stripHTML(choice.text || '');
              if (choiceText) textContent += `${String.fromCharCode(65 + i)}) ${choiceText}\n`;
            });
          }
          // Add more library-specific handling if needed
          textContent = textContent.trim();
          if (textContent) {
            doc.fontSize(12).text(textContent, left, top, { width: w, height: h, align: 'left' });
          }
        }
      }
      slideIndex++;
    }
  }

  // locate content.json (common locations)
  let jsonData = null;
  const possibleContent = [
    path.join(extractDir, "content", "content.json"),
    path.join(extractDir, "content.json"),
    path.join(extractDir, "content")
  ];
  for (const p of possibleContent) {
    if (await fs.pathExists(p) && (await fs.stat(p)).isFile()) {
      jsonData = JSON.parse(await fs.readFile(p, "utf8"));
      break;
    }
  }

  // fallback: scan for a json that looks like H5P content
  if (!jsonData) {
    const files = await fs.readdir(extractDir);
    for (const f of files) {
      if (f.toLowerCase().endsWith(".json")) {
        try {
          const cand = JSON.parse(await fs.readFile(path.join(extractDir, f), "utf8"));
          if (cand && typeof cand === "object" && (cand.title || cand.library || cand.params)) { jsonData = cand; break; }
        } catch {}
      }
    }
  }

  if (!jsonData) {
    throw new Error("Could not find content.json in the extracted H5P.");
  }

  // Load h5p.json to determine main library
  let mainLibrary = null;
  const h5pJsonPath = path.join(extractDir, 'h5p.json');
  if (await fs.pathExists(h5pJsonPath)) {
    try {
      const h5pData = JSON.parse(await fs.readFile(h5pJsonPath, 'utf8'));
      mainLibrary = h5pData.mainLibrary;
    } catch (e) {
      console.warn("Error parsing h5p.json:", e.message);
    }
  }

  if (mainLibrary === 'H5P.CoursePresentation') {
    await parseCoursePresentation(jsonData, doc, findAsset);
  } else {
    await parseContent(jsonData);
  }

  // Add page numbers to all pages
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fillColor('gray')
       .fontSize(10)
       .text(`Page ${i + 1}`, 0, doc.page.height - 35, { align: 'center', width: doc.page.width });
    doc.page.margins.bottom = originalBottom;
  }

  doc.end();
  await new Promise(resolve => pdfStream.on("finish", resolve));

  // Clean up extract dir
  await fs.remove(extractDir);
}

// Route for the UI (serves index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to handle file upload and conversion
app.post('/upload', upload.single('h5pFile'), async (req, res) => {
  const h5pFilePath = req.file.path;
  const outputPDFPath = path.join(os.tmpdir(), req.file.originalname.replace(/\.h5p$/, '') + '.pdf');

  try {
    await convertH5PtoPDF(h5pFilePath, outputPDFPath);
    res.download(outputPDFPath, path.basename(outputPDFPath), async (err) => {
      if (err) {
        console.error(err);
      }
      // Clean up temp files
      await fs.remove(h5pFilePath);
      await fs.remove(outputPDFPath);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error converting file: ' + err.message);
    // Clean up
    await fs.remove(h5pFilePath);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Open the URL in your browser to use the UI.');
});