import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface ReportPdfProfile {
  mbti?: string | null;
  cognitivePercentile?: number | null;
  axisStrengths?: Record<string, number> | null;
}

export async function generateReportPdfBuffer(
  firstName: string,
  reportText: string,
  resultsUrl: string,
  profile?: ReportPdfProfile
) {
  const pdfDoc = await PDFDocument.create();
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 48;
  const right = 48;
  const headerY = pageHeight - 28;
  const contentTop = pageHeight - 78;
  const contentBottom = 72;
  const maxWidth = pageWidth - left - right;
  const safeName = (firstName || 'There').trim();
  const displayName = safeName || 'There';
  const displayUpper = displayName.toUpperCase();
  const mbti = typeof profile?.mbti === 'string' && profile.mbti.trim()
    ? profile.mbti.trim().toUpperCase()
    : '----';
  const mbtiLine = `${mbti} | Personalized Blueprint`;
  const cp = typeof profile?.cognitivePercentile === 'number' && Number.isFinite(profile.cognitivePercentile)
    ? Math.max(0, Math.min(100, Math.round(profile.cognitivePercentile)))
    : null;
  const suffix = (n: number) => {
    if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
    if (n % 10 === 1) return `${n}st`;
    if (n % 10 === 2) return `${n}nd`;
    if (n % 10 === 3) return `${n}rd`;
    return `${n}th`;
  };
  const iqLine = cp != null
    ? `Cognitive Percentile (${suffix(cp)} percentile)`
    : 'Cognitive Percentile (Not assessed)';
  const axis = profile?.axisStrengths ?? null;
  const axisLine =
    axis &&
    typeof axis.EI === 'number' &&
    typeof axis.SN === 'number' &&
    typeof axis.TF === 'number' &&
    typeof axis.JP === 'number'
      ? `Axis Strengths EI ${Math.round(axis.EI)} | SN ${Math.round(axis.SN)} | TF ${Math.round(axis.TF)} | JP ${Math.round(axis.JP)}`
      : '';

  const wrapText = (text: string, size: number, activeFont = serif) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (activeFont.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        if (activeFont.widthOfTextAtSize(word, size) <= maxWidth) {
          current = word;
        } else {
          let chunk = '';
          for (const ch of word) {
            const next = chunk + ch;
            if (activeFont.widthOfTextAtSize(next, size) <= maxWidth) {
              chunk = next;
            } else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          }
          current = chunk;
        }
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const isHeadingBlock = (block: string) => {
    if (/^SECTION\s+\d+/i.test(block)) return true;
    if (block.length <= 70 && /^[A-Z0-9:&\-'\s]+$/.test(block) && /[A-Z]/.test(block)) return true;
    return false;
  };

  const pages = [] as ReturnType<typeof pdfDoc.addPage>[];

  const cover = pdfDoc.addPage([pageWidth, pageHeight]);
  pages.push(cover);
  const coverHeader = `TalentRank Blueprint | ${displayName}`;
  const coverHeaderW = serif.widthOfTextAtSize(coverHeader, 10);
  cover.drawText(coverHeader, {
    x: pageWidth - right - coverHeaderW,
    y: pageHeight - 42,
    size: 10,
    font: serif,
    color: rgb(0.45, 0.45, 0.45),
  });
  const title1 = 'THE TALENTRANK';
  const title2 = 'BLUEPRINT';
  const title1W = serifBold.widthOfTextAtSize(title1, 29);
  const title2W = serifBold.widthOfTextAtSize(title2, 29);
  const subtitle = 'Your Complete Psychological Warfare Manual';
  const subtitleW = serifItalic.widthOfTextAtSize(subtitle, 18);
  const prep = 'Prepared Exclusively For';
  const prepW = serif.widthOfTextAtSize(prep, 14);
  const nameW = serifBold.widthOfTextAtSize(displayUpper, 22);
  const mbtiW = serifItalic.widthOfTextAtSize(mbtiLine, 14);
  const iqW = serif.widthOfTextAtSize(iqLine, 14);
  const axisW = axisLine ? serif.widthOfTextAtSize(axisLine, 12) : 0;
  cover.drawText(title1, {
    x: (pageWidth - title1W) / 2,
    y: pageHeight - 245,
    size: 29,
    font: serifBold,
    color: rgb(0.07, 0.07, 0.07),
  });
  cover.drawText(title2, {
    x: (pageWidth - title2W) / 2,
    y: pageHeight - 287,
    size: 29,
    font: serifBold,
    color: rgb(0.07, 0.07, 0.07),
  });
  cover.drawText(subtitle, {
    x: (pageWidth - subtitleW) / 2,
    y: pageHeight - 324,
    size: 18,
    font: serifItalic,
    color: rgb(0.16, 0.16, 0.16),
  });
  cover.drawText(prep, {
    x: (pageWidth - prepW) / 2,
    y: pageHeight - 384,
    size: 14,
    font: serif,
    color: rgb(0.22, 0.22, 0.22),
  });
  cover.drawText(displayUpper, {
    x: (pageWidth - nameW) / 2,
    y: pageHeight - 420,
    size: 22,
    font: serifBold,
    color: rgb(0.1, 0.2, 0.34),
  });
  cover.drawText(mbtiLine, {
    x: (pageWidth - mbtiW) / 2,
    y: pageHeight - 464,
    size: 14,
    font: serifItalic,
    color: rgb(0.18, 0.18, 0.18),
  });
  cover.drawText(iqLine, {
    x: (pageWidth - iqW) / 2,
    y: pageHeight - 488,
    size: 14,
    font: serif,
    color: rgb(0.18, 0.18, 0.18),
  });
  if (axisLine) {
    cover.drawText(axisLine, {
      x: (pageWidth - axisW) / 2,
      y: pageHeight - 510,
      size: 12,
      font: serif,
      color: rgb(0.22, 0.22, 0.22),
    });
  }
  const coverFooter = 'Page 1 | Confidential';
  const coverFooterW = serif.widthOfTextAtSize(coverFooter, 11);
  cover.drawText(coverFooter, {
    x: (pageWidth - coverFooterW) / 2,
    y: 36,
    size: 11,
    font: serif,
    color: rgb(0.45, 0.45, 0.45),
  });

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  pages.push(page);
  let y = contentTop;

  const ensureSpace = (need: number) => {
    if (y - need < contentBottom) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(page);
      y = contentTop;
    }
  };

  const drawLines = (
    lines: string[],
    size: number,
    useBold: boolean,
    spacingAfter: number,
    activeFont: typeof serif = serif
  ) => {
    const lineHeight = size + 4;
    ensureSpace(lines.length * lineHeight + spacingAfter);
    for (const line of lines) {
      page.drawText(line, {
        x: left,
        y,
        size,
        font: useBold ? serifBold : activeFont,
        color: rgb(0.12, 0.12, 0.12),
      });
      y -= lineHeight;
    }
    y -= spacingAfter;
  };

  const blocks = (reportText || '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) {
    drawLines(['No report text available.'], 12, false, 8, serif);
  } else {
    for (const block of blocks) {
      if (block === '***') {
        ensureSpace(20);
        page.drawLine({
          start: { x: left, y: y - 6 },
          end: { x: pageWidth - right, y: y - 6 },
          thickness: 1,
          color: rgb(0.6, 0.6, 0.6),
        });
        y -= 22;
        continue;
      }
      if (isHeadingBlock(block)) {
        if (/^SECTION\s+\d+/i.test(block) && y < contentTop - 20) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          pages.push(page);
          y = contentTop;
        }
        drawLines(wrapText(block.toUpperCase(), 15, serifBold), 15, true, 10, serifBold);
      } else {
        drawLines(wrapText(block, 12, serif), 12, false, 8, serif);
      }
    }
  }

  drawLines(wrapText(`Results URL: ${resultsUrl}`, 10, serif), 10, false, 0, serif);

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const pageNum = i + 1;
    if (pageNum === 1) continue;
    const header = `TalentRank Blueprint | ${displayName}`;
    const headerWidth = serif.widthOfTextAtSize(header, 10);
    p.drawText(header, {
      x: pageWidth - right - headerWidth,
      y: headerY,
      size: 10,
      font: serif,
      color: rgb(0.22, 0.22, 0.22),
    });
    const footer = `Page ${pageNum} | Confidential`;
    const footerWidth = serif.widthOfTextAtSize(footer, 11);
    p.drawText(footer, {
      x: (pageWidth - footerWidth) / 2,
      y: 36,
      size: 11,
      font: serif,
      color: rgb(0.28, 0.28, 0.28),
    });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
