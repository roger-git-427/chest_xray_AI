import { jsPDF } from 'jspdf';
import type { ScreeningResponse } from '../api/client';
import { es } from '../i18n/es';
import { imageToPdfDataUrl } from './imageToPdfDataUrl';

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

const C = {
  teal: [13, 148, 136] as [number, number, number],
  tealDark: [15, 118, 110] as [number, number, number],
  slate900: [15, 23, 42] as [number, number, number],
  slate600: [71, 85, 105] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  amberBg: [254, 243, 199] as [number, number, number],
  amberText: [146, 64, 14] as [number, number, number],
  emeraldBg: [209, 250, 229] as [number, number, number],
  emeraldText: [6, 95, 70] as [number, number, number],
  cardBg: [248, 250, 252] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
};

export type PdfExportOptions = {
  sourceLabel?: string;
  imageUrl?: string | null;
  sourceKind?: string;
  screenedAt?: string;
};

function setFill(doc: jsPDF, rgb: [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(doc: jsPDF, rgb: [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setText(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

function safeFilename(part: string): string {
  return part.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 48) || 'estudio';
}

function drawHeader(doc: jsPDF): number {
  setFill(doc, C.teal);
  doc.rect(0, 0, PAGE_W, 42, 'F');
  setFill(doc, C.tealDark);
  doc.rect(0, 38, PAGE_W, 4, 'F');

  setText(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(es.productName, MARGIN, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(es.productEdition.toUpperCase(), MARGIN, 25);

  doc.setFontSize(8);
  const dateStr = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
  doc.text(dateStr, PAGE_W - MARGIN, 18, { align: 'right' });

  doc.setFontSize(7);
  doc.text(es.resultsSubtitle, PAGE_W - MARGIN, 24, { align: 'right' });

  return 52;
}

function ensureSpace(doc: jsPDF, y: number, need: number): number {
  if (y + need > PAGE_H - 22) {
    doc.addPage();
    setFill(doc, C.cardBg);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
    return 18;
  }
  return y;
}

function drawStudyMeta(
  doc: jsPDF,
  y: number,
  opts: PdfExportOptions,
  filename: string,
  thumbDataUrl: string | null,
): number {
  const blockH = thumbDataUrl ? 48 : 32;
  y = ensureSpace(doc, y, blockH + 4);

  const thumbW = 42;
  const textW = thumbDataUrl ? CONTENT_W - thumbW - 8 : CONTENT_W;

  setDraw(doc, C.border);
  setFill(doc, C.white);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, 'FD');

  if (thumbDataUrl) {
    doc.addImage(thumbDataUrl, 'JPEG', MARGIN + 4, y + 4, thumbW, blockH - 8);
  }

  const textX = thumbDataUrl ? MARGIN + thumbW + 10 : MARGIN + 5;
  let textY = y + 7;

  setText(doc, C.slate600);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(es.source.toUpperCase(), textX, textY);
  textY += 5;

  setText(doc, C.slate900);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  const study = opts.sourceLabel || filename;
  doc.text(wrapText(doc, study, textW - 6).slice(0, 2), textX, textY);
  textY += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setText(doc, C.slate600);
  if (opts.sourceKind) {
    doc.text(`${opts.sourceKind}`, textX, textY);
    textY += 4;
  }
  const screened = opts.screenedAt
    ? new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(opts.screenedAt))
    : new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date());
  doc.text(`${es.pdfScreenedAt}: ${screened}`, textX, textY);

  return y + blockH + 6;
}

function drawOverallBanner(doc: jsPDF, y: number, flagged: boolean): number {
  y = ensureSpace(doc, y, 24);
  const h = 20;
  if (flagged) {
    setFill(doc, C.amberBg);
    setText(doc, C.amberText);
  } else {
    setFill(doc, C.emeraldBg);
    setText(doc, C.emeraldText);
  }
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const title = flagged ? es.overallReview : es.overallRoutine;
  doc.text(title, MARGIN + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const desc = flagged ? es.overallReviewDesc : es.overallRoutineDesc;
  const descLines = wrapText(doc, desc, CONTENT_W - 12);
  doc.text(descLines[0] ?? '', MARGIN + 5, y + 15);

  return y + h + 8;
}

function drawFindingsTable(
  doc: jsPDF,
  y: number,
  results: ScreeningResponse['results'],
): number {
  const rowH = 7;
  const headerH = 8;
  const tableH = headerH + results.length * rowH + 4;
  y = ensureSpace(doc, y, tableH + 6);

  setText(doc, C.slate600);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(es.pdfFindingsTable.toUpperCase(), MARGIN, y);
  y += 6;

  const cols = [
    MARGIN,
    MARGIN + CONTENT_W * 0.38,
    MARGIN + CONTENT_W * 0.56,
    MARGIN + CONTENT_W * 0.74,
  ];

  setFill(doc, C.teal);
  doc.rect(MARGIN, y, CONTENT_W, headerH, 'F');
  setText(doc, C.white);
  doc.setFontSize(7);
  doc.text(es.pdfColCondition, cols[0] + 2, y + 5);
  doc.text(es.pdfColProbability, cols[1] + 2, y + 5);
  doc.text(es.pdfColThreshold, cols[2] + 2, y + 5);
  doc.text(es.pdfColStatus, cols[3] + 2, y + 5);
  y += headerH;

  results.forEach((r, i) => {
    if (i % 2 === 0) {
      setFill(doc, C.cardBg);
      doc.rect(MARGIN, y, CONTENT_W, rowH, 'F');
    }
    setText(doc, C.slate900);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(r.condition_label, cols[0] + 2, y + 4.5);
    doc.text(`${Math.round(r.probability * 100)}%`, cols[1] + 2, y + 4.5);
    doc.text(`${Math.round(r.threshold * 100)}%`, cols[2] + 2, y + 4.5);

    const status = r.flagged ? es.flagged : es.notFlagged;
    if (r.flagged) setText(doc, C.amberText);
    else setText(doc, C.emeraldText);
    doc.setFont('helvetica', 'bold');
    doc.text(status, cols[3] + 2, y + 4.5);
    y += rowH;
  });

  return y + 8;
}

function drawFindingCard(
  doc: jsPDF,
  y: number,
  result: ScreeningResponse['results'][0],
): number {
  const recLines = wrapText(doc, result.recommendation, CONTENT_W - 14);
  const cardH = 38 + Math.max(0, recLines.length - 1) * 4;
  y = ensureSpace(doc, y, cardH);

  setDraw(doc, C.border);
  setFill(doc, C.white);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 2, 2, 'FD');

  const pct = Math.round(result.probability * 100);
  const thresh = Math.round(result.threshold * 100);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(doc, C.slate900);
  doc.text(result.condition_label, MARGIN + 5, y + 9);

  const badge = result.flagged ? es.flagged : es.notFlagged;
  doc.setFontSize(7);
  if (result.flagged) {
    setFill(doc, C.amberBg);
    setText(doc, C.amberText);
  } else {
    setFill(doc, C.emeraldBg);
    setText(doc, C.emeraldText);
  }
  const badgeW = doc.getTextWidth(badge) + 6;
  doc.roundedRect(MARGIN + CONTENT_W - badgeW - 5, y + 3, badgeW, 7, 1.5, 1.5, 'F');
  doc.text(badge, MARGIN + CONTENT_W - badgeW - 2, y + 8);

  setText(doc, C.slate600);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `${es.probability}: ${pct}%  ·  ${es.thresholdLabel}: ${thresh}%`,
    MARGIN + 5,
    y + 16,
  );

  const barY = y + 20;
  const barW = CONTENT_W - 10;
  setFill(doc, C.border);
  doc.roundedRect(MARGIN + 5, barY, barW, 3.5, 1, 1, 'F');
  const fillW = (barW * Math.min(pct, 100)) / 100;
  if (result.flagged) {
    setFill(doc, [245, 158, 11]);
  } else {
    setFill(doc, [16, 185, 129]);
  }
  if (fillW > 0) {
    doc.roundedRect(MARGIN + 5, barY, fillW, 3.5, 1, 1, 'F');
  }
  const threshX = MARGIN + 5 + (barW * thresh) / 100;
  setDraw(doc, C.slate900);
  doc.setLineWidth(0.4);
  doc.line(threshX, barY - 0.5, threshX, barY + 4);

  setText(doc, C.slate600);
  doc.setFontSize(8);
  doc.text(recLines, MARGIN + 5, y + 28);

  doc.setFontSize(6);
  setText(doc, C.slate400);
  doc.text(es.modelSignal, MARGIN + 5, y + cardH - 4);

  return y + cardH + 6;
}

function drawFooter(doc: jsPDF, response: ScreeningResponse) {
  const pages = doc.getNumberOfPages();
  const conditionsLine = response.results.map((r) => r.condition_label).join(' · ');
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    setDraw(doc, C.border);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 20, PAGE_W - MARGIN, PAGE_H - 20);

    setText(doc, C.slate600);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(es.pdfReportVersion, MARGIN, PAGE_H - 17);
    if (conditionsLine) {
      const condLines = wrapText(doc, conditionsLine, CONTENT_W);
      doc.text(condLines.slice(0, 2), MARGIN, PAGE_H - 13.5);
    }

    setText(doc, C.slate400);
    doc.setFontSize(6.5);
    const disclaimerLines = wrapText(doc, es.disclaimer, CONTENT_W);
    doc.text(disclaimerLines, MARGIN, PAGE_H - 9);

    doc.setFontSize(7);
    doc.text(
      `${es.productName} · ${i} / ${pages}`,
      PAGE_W - MARGIN,
      PAGE_H - 8,
      { align: 'right' },
    );
  }
}

export async function generateScreeningPdf(
  response: ScreeningResponse,
  options: PdfExportOptions = {},
): Promise<void> {
  const thumbDataUrl = options.imageUrl
    ? await imageToPdfDataUrl(options.imageUrl)
    : null;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  setFill(doc, C.cardBg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  let y = drawHeader(doc);
  y = drawStudyMeta(doc, y, options, response.filename, thumbDataUrl);
  y = drawOverallBanner(doc, y, response.overall_flagged);
  y = drawFindingsTable(doc, y, response.results);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, C.slate600);
  y += 2;
  doc.text(es.resultsTitle.toUpperCase(), MARGIN, y);
  y += 8;

  for (const result of response.results) {
    y = drawFindingCard(doc, y, result);
  }

  drawFooter(doc, response);

  const name = safeFilename(options.sourceLabel || response.filename);
  const stamp = new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date())
    .replace(/[/\s:,]/g, '-');
  doc.save(`ByteAI-informe-${name}-${stamp}.pdf`);
}
