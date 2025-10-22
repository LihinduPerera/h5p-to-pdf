# H5P to PDF Converter

![Node.js-Express](https://img.shields.io/badge/Node.js-Express-green)

A powerful and elegant web application that converts H5P interactive content to PDF format. Built with Node.js and Express, featuring a beautiful dark theme interface.

---

## ✨ Features

- **Beautiful Dark UI** — Modern, responsive dark theme interface.
- **Fast Conversion** — Quick processing of H5P files to PDF.
- **Multiple H5P Types** — Supports various H5P content types including Course Presentations, Interactive Videos and quizzes.
- **Drag & Drop** — Intuitive file upload with drag & drop functionality.
- **Secure Processing** — Files are processed locally and temporarily; no persistent storage.
- **Content Preservation** — Text content, images, and structure from H5P files are preserved where possible.

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/h5p-to-pdf-converter.git
cd h5p-to-pdf-converter

# Install dependencies
npm install
```

### Start the application

```bash
npm start
```

Open your browser and navigate to `http://localhost:3000`.

---

## 📦 Dependencies

This project uses the following key dependencies:

- `express` — Web server framework
- `multer` — File upload handling
- `fs-extra` — Enhanced file system operations
- `pdfkit` — PDF generation
- `unzipper` — H5P file extraction (H5P files are zip archives)

Add any other project-specific libraries you use here.

---

## 🛠️ Project Structure

```
h5p-to-pdf-converter/
├── server.js              # Main server file
├── package.json           # Project dependencies and scripts
├── public/                # Frontend assets
│   ├── index.html         # Main HTML file
│   ├── style.css          # Dark theme styles
│   └── script.js          # Frontend JavaScript
└── README.md              # Project documentation
```

---

## 🎯 Usage

1. Open the application in your web browser.
2. Upload an H5P file using either:
   - Drag and drop onto the upload zone, or
   - Click **Browse Files** to select manually.
3. The app will process your H5P file and convert it to PDF.
4. The converted PDF will automatically download.

**Note:** This tool is intended for local development use. Verify converted PDF content against the original H5P.

---

## 🔧 How It Works

The conversion flow is straightforward:

1. **File Upload** — H5P file is uploaded to the server.
2. **Extraction** — H5P file (a zip archive) is extracted to a temporary folder.
3. **Content Parsing** — JSON content and asset files are parsed from the H5P package.
4. **PDF Generation** — Parsed content is formatted and rendered into a PDF using `pdfkit`.
5. **Delivery & Cleanup** — The PDF is returned to the user and temporary files are cleaned up.

### Key Functions (example names)
- `convertH5PtoPDF()` — Main conversion function
- `parseCoursePresentation()` — Handler for Course Presentation content
- `findAsset()` — Resolves file paths within H5P structure
- `parseContent()` — Recursive content parser

---

## ✅ Supported H5P Content Types

- Course Presentations
- Interactive Videos
- Quizzes
- Text and image–based content

> Some complex interactions (advanced branching, complex animations, timed interactions) may not translate perfectly to a static PDF.

---

## 🎨 UI Features

- Dark Theme with modern gradient backgrounds
- Responsive design (desktop & mobile)
- Visual feedback (loading animations and status updates)
- File preview (displays selected file name before conversion)
- Auto-reset after a successful conversion

---

## 🚫 Limitations

- Development tool — not intended for production deployment.
- No enforced file size limits.
- Some interactive or dynamic H5P elements cannot be converted to static PDF accurately.
- Requires well-structured H5P packages.

---

## 🔒 Security Notes

- Files are processed in temporary directories and removed after processing.
- No persistent storage of uploaded files by default.
- Intended for local development — do not expose to public without implementing proper security controls (authentication, rate limiting, input validation, file size checks, virus scanning, etc.).

---

## 🛠️ Development

Run in development mode:

```bash
npm start
```

**Helpful tips**
- Check server console logs for detailed error messages when conversion fails.
- Test with multiple H5P types and sizes.
- Add unit tests around parsing and PDF generation where possible.

---

## 🤝 Contributing

This repository is intended as an internal development tool. For team contributions:

- Follow the existing code style.
- Test with a variety of H5P content types.
- Ensure PDF output maintains content integrity.
- Open issues or PRs for bug fixes and feature improvements.

---

## 🐛 Troubleshooting

**Common issues & fixes**

- **Conversion fails** — Ensure the H5P zip is not corrupted and is properly structured. Check server logs for stack traces.
- **PDF missing content** — Some interactive elements can't be rendered as static content. Verify extracted JSON assets and referenced images.
- **Server won't start** — Verify Node.js (v14+) and that port `3000` is available. Ensure dependencies installed (`npm install`).

---

## ⚠️ Important Notes

- Designed for development use only — not production-ready.
- Always verify the converted PDF against the original H5P content.

---

*Built with ❤️ for internal tooling.*

