import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ScanDocument } from './rag-search';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export class ExportEngine {

  static async exportToZip(documents: ScanDocument[], archiveName: string = "RAG_Archive.zip") {
    const zip = new JSZip();


    const txtFolder = zip.folder("raw_text");
    for (const doc of documents) {
      const safeTitle = (doc.title || doc.id).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      txtFolder?.file(`${safeTitle}.txt`, doc.content);
    }


    const pdfBytes = await this.generateCombinedPDF(documents);
    zip.file("Unified_Report.pdf", pdfBytes);

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, archiveName);
  }

  static async generateCombinedPDF(documents: ScanDocument[], options?: { watermark?: string }): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);


    const watermarkText = options?.watermark;

    for (const docObj of documents) {
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      let y = height - 50;


      const applyWatermark = (p: any) => {
         if (watermarkText) {
            p.drawText(watermarkText, {
               x: width / 2 - 150,
               y: height / 2,
               size: 60,
               font: boldFont,
               color: rgb(0.9, 0.9, 0.9),
               opacity: 0.3,
               rotate: { angle: 45, type: 'degrees' },
            });
         }
      };

      applyWatermark(page);

      const drawText = (text: string, currentY: number, size: number, currentFont: any) => {
        const lines = text.split('\n');
        let newY = currentY;

        for (const line of lines) {
           const words = line.split(' ');
           let currentLine = '';

           for (const word of words) {
              if (currentLine.length + word.length > 85) {
                 page.drawText(currentLine, { x: 50, y: newY, size, font: currentFont });
                 newY -= size * 1.5;
                 currentLine = word + ' ';
                 if (newY < 50) {
                    page = pdfDoc.addPage();
                    applyWatermark(page);
                    newY = height - 50;
                 }
              } else {
                 currentLine += word + ' ';
              }
           }
           if (currentLine) {
              page.drawText(currentLine, { x: 50, y: newY, size, font: currentFont });
              newY -= size * 1.5;
           }
           if (newY < 50) {
              page = pdfDoc.addPage();
              applyWatermark(page);
              newY = height - 50;
           }
        }
        return newY;
      }

      y = drawText(docObj.title || "Untitled Scan Document", y, 18, boldFont);
      y -= 20;
      y = drawText(`Indexed Tags: ${(docObj.tags || []).join(", ")}`, y, 10, font);
      y -= 20;
      y = drawText(docObj.content, y, 12, font);
    }

    return await pdfDoc.save();
  }

  static async exportReportPDF(documents: ScanDocument[], filename: string = "RoyScript_TSR_Report.pdf", watermark?: string) {
     const bytes = await this.generateCombinedPDF(documents, { watermark });
     const blob = new Blob([bytes], { type: "application/pdf" });
     saveAs(blob, filename);
  }

  static async exportSinglePDF(docTitle: string, content: string, watermark?: string) {
     const bytes = await this.generateCombinedPDF([{ title: docTitle, content, id: "1", owner_id: "local", createdAt: new Date() }], { watermark });
     const blob = new Blob([bytes], { type: "application/pdf" });
     const safeTitle = docTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
     saveAs(blob, `${safeTitle}.pdf`);
  }

  static async exportToDocx(docTitle: string, content: string) {
    const lines = content.split('\n');
    const docParagraphs = [
      new Paragraph({
        children: [
          new TextRun({
            text: docTitle || "Extracted Document",
            bold: true,
            size: 32,
          }),
        ],
      }),
      new Paragraph({ text: "" }),
    ];

    lines.forEach((line) => {
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24,
            }),
          ],
        })
      );
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: docParagraphs,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const safeTitle = (docTitle || "extracted_doc").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(blob, `${safeTitle}.docx`);
  }

  static async exportToExcel(docTitle: string, content: string) {

    const lines = content.split('\n');
    let csvContent = "";

    lines.forEach((line) => {

      if (line.includes('|')) {
        const columns = line.split('|')
          .map(col => col.trim())
          .filter((col, idx, arr) => {

             if (idx === 0 && col === '') return false;
             if (idx === arr.length - 1 && col === '') return false;
             return true;
          });

        if (columns.length > 0) {

          const formattedRow = columns.map(val => `"${val.replace(/"/g, '""')}"`).join(",");
          csvContent += formattedRow + "\r\n";
        }
      } else if (line.trim().length > 0) {

        const cleanLine = line.trim();
        csvContent += `"${cleanLine.replace(/"/g, '""')}"\r\n`;
      }
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const safeTitle = (docTitle || "table_data").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(blob, `${safeTitle}_excel.csv`);
  }
}
