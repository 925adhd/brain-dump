
import pptxgen from "pptxgenjs";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, SectionType, PageBreak, BorderStyle } from "docx";
import { Presentation } from "./types";

// Standard 16:9 PowerPoint slide dimensions in inches
const SLIDE_W = 10;
const SLIDE_H = 5.625;
const THEME_ACCENT = "4F46E5";
const THEME_BG = "F8FAFC";
const TEXT_MAIN = "1E293B";
const TEXT_MUTED = "475569";

export const exportToPptx = async (presentation: Presentation) => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';

  // Title Slide
  const titleSlide = pres.addSlide();
  if (presentation.coverImageUrl) {
    titleSlide.addImage({ 
      data: presentation.coverImageUrl, 
      x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
      sizing: { type: 'cover', w: SLIDE_W, h: SLIDE_H }
    });
    titleSlide.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
      fill: { color: "000000", transparency: 60 }
    });
    titleSlide.addText(presentation.title, {
      x: 0.5, y: 1.8, w: 9,
      align: "center", fontSize: 44, color: "FFFFFF", bold: true, fontFace: "Arial"
    });
    titleSlide.addText(presentation.summary, {
      x: 0.5, y: 3.2, w: 9,
      align: "center", fontSize: 22, color: "FFFFFF", fontFace: "Arial", italic: true
    });
  } else {
    titleSlide.background = { fill: THEME_BG };
    titleSlide.addText(presentation.title, {
      x: 1, y: 1.5, w: 8, h: 1.5, align: "center", fontSize: 44, color: TEXT_MAIN, bold: true, fontFace: "Arial", valign: "bottom"
    });
    titleSlide.addText(presentation.summary, {
      x: 1, y: 3.2, w: 8, h: 1.0, align: "center", fontSize: 20, color: TEXT_MUTED, fontFace: "Arial", valign: "top", italic: true
    });
  }

  presentation.slides.forEach((slide) => {
    const s = pres.addSlide();
    s.background = { fill: THEME_BG };
    
    if (slide.imageUrl) {
      if (slide.recommendedAsVisualOnly) {
        s.addImage({ 
          data: slide.imageUrl, 
          x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
          sizing: { type: 'cover', w: SLIDE_W, h: SLIDE_H }
        });
      } else {
        // Balanced Layout
        s.addShape(pres.ShapeType.rect, { x: 0.4, y: 0.4, w: 9.2, h: 4.8, fill: { color: "FFFFFF" } });
        s.addImage({ 
          data: slide.imageUrl, 
          x: 0.6, y: 0.9, w: 4.6, h: 3.8,
          sizing: { type: 'cover', w: 4.6, h: 3.8 } 
        });
        s.addText(slide.title, { x: 5.4, y: 0.8, w: 4.2, fontSize: 26, bold: true, color: TEXT_MAIN, fontFace: "Arial" });
        const bulletObjects = slide.bullets.map((b, idx) => ({ 
          text: b, options: { bullet: true, color: TEXT_MUTED, fontSize: 16, paraSpaceBefore: idx === 0 ? 0 : 12, breakLine: true } 
        }));
        s.addText(bulletObjects, { x: 5.4, y: 1.8, w: 4.0, h: 3.2, fontSize: 16, fontFace: "Arial", align: "left", valign: "top" });
      }
    } else {
      // High-Quality Text-Only Fallback Layout (Centered & Balanced)
      s.addShape(pres.ShapeType.rect, { x: 0.5, y: 0.5, w: 9, h: 4.625, fill: { color: "FFFFFF" }, line: { color: THEME_ACCENT, width: 1 } });
      s.addText(slide.title, { 
        x: 1, y: 0.8, w: 8, fontSize: 32, bold: true, color: TEXT_MAIN, fontFace: "Arial", align: "center" 
      });
      
      const bulletPoints = slide.bullets.map((b, idx) => ({ 
        text: b, 
        options: { bullet: true, color: TEXT_MUTED, fontSize: 18, paraSpaceBefore: 12, breakLine: true } 
      }));
      
      s.addText(bulletPoints, { 
        x: 1.5, y: 1.8, w: 7, h: 3.0, fontSize: 18, fontFace: "Arial", align: "left", valign: "top" 
      });
    }
    s.addNotes(slide.speakerNotes);
  });

  await pres.writeFile({ fileName: `${presentation.title.replace(/\s+/g, '-')}.pptx` });
};

export const exportToDocx = async (p: Presentation) => {
  const children: any[] = [
    new Paragraph({ 
      text: p.title.toUpperCase(), 
      heading: HeadingLevel.TITLE, 
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }),
    new Paragraph({ 
      children: [new TextRun({ text: `Full Script: ${p.slideCount} Slides`, italic: true, size: 18 })],
      alignment: AlignmentType.CENTER, 
      spacing: { after: 400 } 
    }),
  ];

  p.slides.forEach((slide, index) => {
    // Continuous slide script entries
    children.push(new Paragraph({ 
      children: [
        new TextRun({ text: `SLIDE ${index + 1}: `, bold: true, color: "4F46E5", size: 20 }),
        new TextRun({ text: slide.title, bold: true, color: "1E293B", size: 20 })
      ],
      spacing: { before: 240, after: 80 },
      border: {
        bottom: { color: "F1F5F9", space: 1, style: BorderStyle.SINGLE, size: 2 }
      }
    }));

    // Compact script body
    children.push(new Paragraph({ 
      text: slide.speakerNotes, 
      spacing: { after: 320 },
      indent: { left: 240 }
    }));
  });

  children.push(new Paragraph({
    text: "--- END OF SCRIPT ---",
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 }
  }));

  const doc = new Document({ 
    sections: [{ 
      properties: {
        type: SectionType.CONTINUOUS
      },
      children 
    }] 
  });

  const blob = await Packer.toBlob(doc);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${p.title.replace(/\s+/g, '-')}-script.docx`;
  link.click();
};
