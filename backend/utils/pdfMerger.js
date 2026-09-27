const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Converts an array of image file paths into a single PDF document
 * @param {Array<string>} imagePaths - List of absolute paths to images
 * @param {string} outputPath - Target PDF path
 * @returns {Promise<number>} - Number of pages in the generated PDF
 */
const convertImagesToPDF = async (imagePaths, outputPath) => {
  const pdfDoc = await PDFDocument.create();

  for (const imgPath of imagePaths) {
    if (!fs.existsSync(imgPath)) continue;
    const imgBytes = fs.readFileSync(imgPath);
    const ext = path.extname(imgPath).toLowerCase();

    let image;
    if (ext === '.png') {
      image = await pdfDoc.embedPng(imgBytes);
    } else {
      // JPEG, JPG, WEBP, etc.
      image = await pdfDoc.embedJpg(imgBytes);
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return imagePaths.length;
};

/**
 * Combines 2 or more images onto a SINGLE A4 page (Front & Back ID card layout)
 * @param {Array<string>} imagePaths - List of absolute paths to 2 images
 * @param {string} outputPath - Target PDF path
 * @returns {Promise<number>} - Always returns 1 (1 single page)
 */
const combineImagesToSinglePage = async (imagePaths, outputPath) => {
  const pdfDoc = await PDFDocument.create();
  // Standard A4 dimensions in points: 595.28 x 841.89
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const validPaths = imagePaths.filter(p => fs.existsSync(p));
  const count = validPaths.length;

  if (count === 0) {
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    return 1;
  }

  // Draw background border / title
  const margin = 36; // 0.5 inch margin
  const availWidth = pageWidth - (margin * 2);

  if (count === 1) {
    const imgBytes = fs.readFileSync(validPaths[0]);
    const ext = path.extname(validPaths[0]).toLowerCase();
    const image = ext === '.png' ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
    
    const scale = Math.min(availWidth / image.width, (pageHeight - margin * 2) / image.height, 1);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const x = (pageWidth - drawW) / 2;
    const y = (pageHeight - drawH) / 2;

    page.drawImage(image, { x, y, width: drawW, height: drawH });
  } else {
    // 2 or more images: Split page vertically into 2 halves (Top = Front, Bottom = Back)
    const halfHeight = (pageHeight - (margin * 3)) / 2;

    for (let i = 0; i < Math.min(count, 2); i++) {
      const imgBytes = fs.readFileSync(validPaths[i]);
      const ext = path.extname(validPaths[i]).toLowerCase();
      const image = ext === '.png' ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);

      const scale = Math.min(availWidth / image.width, halfHeight / image.height, 1);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      const x = (pageWidth - drawW) / 2;

      // Top image (index 0) vs Bottom image (index 1)
      let y = 0;
      if (i === 0) {
        y = pageHeight - margin - halfHeight + (halfHeight - drawH) / 2;
      } else {
        y = margin + (halfHeight - drawH) / 2;
      }

      page.drawImage(image, { x, y, width: drawW, height: drawH });
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return 1;
};

module.exports = { convertImagesToPDF, combineImagesToSinglePage };

