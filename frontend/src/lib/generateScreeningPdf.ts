import { jsPDF } from 'jspdf';
import type { DicomMetadata, ScreeningResponse, StudyMetadata } from '../api/client';
import type { ReportDraft } from '../hooks/useReportDraft';
import { es } from '../i18n/es';
import { imageToPdfDataUrl } from './imageToPdfDataUrl';

const MARGIN = 16;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 22;

const C = {
  navy: [15, 23, 42] as [number, number, number],
  teal: [13, 148, 136] as [number, number, number],
  tealLight: [204, 251, 241] as [number, number, number],
  tealMuted: [45, 212, 191] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  amberBg: [255, 251, 235] as [number, number, number],
  amberBorder: [251, 191, 36] as [number, number, number],
  amberText: [146, 64, 14] as [number, number, number],
  emeraldBg: [236, 253, 245] as [number, number, number],
  emeraldBorder: [52, 211, 153] as [number, number, number],
  emeraldText: [6, 95, 70] as [number, number, number],
};

export type PdfExportOptions = {
  sourceLabel?: string;
  imageUrl?: string | null;
  sourceKind?: string;
  screenedAt?: string;
  metadata?: StudyMetadata | null;
  dicomMetadata?: DicomMetadata | null;
  reportDraft?: ReportDraft;
  clinicallyReviewed?: boolean;
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

function formatDateTime(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(d);
}

function makeReportId(filename: string, screenedAt?: string): string {
  const d = screenedAt ? new Date(screenedAt) : new Date();
  const stamp = d.toISOString().slice(0, 10).replace(/-/g, '');
  const slug = safeFilename(filename).slice(0, 10).toUpperCase();
  return `BAI-${stamp}-${slug}`;
}

function paintPageBackground(doc: jsPDF) {
  setFill(doc, C.white);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function ensureSpace(doc: jsPDF, y: number, need: number): number {
  if (y + need > PAGE_H - FOOTER_H) {
    doc.addPage();
    paintPageBackground(doc);
    return MARGIN + 4;
  }
  return y;
}

function drawSectionTitle(doc: jsPDF, y: number, title: string): number {
  y = ensureSpace(doc, y, 14);
  setFill(doc, C.teal);
  doc.rect(MARGIN, y, 2.5, 6, 'F');
  setText(doc, C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(title.toUpperCase(), MARGIN + 5, y + 4.5);
  setDraw(doc, C.slate200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 8, PAGE_W - MARGIN, y + 8);
  return y + 12;
}

function drawHeader(doc: jsPDF, reportId: string, screenedAt?: string): number {
  paintPageBackground(doc);

  setFill(doc, C.navy);
  doc.rect(0, 0, PAGE_W, 34, 'F');
  setFill(doc, C.teal);
  doc.rect(0, 34, PAGE_W, 1.2, 'F');

  setText(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(es.productName, MARGIN, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, C.tealMuted);
  doc.text(es.productEdition, MARGIN, 19);

  setText(doc, C.slate400);
  doc.setFontSize(6.5);
  doc.text(`${es.pdfReportId}: ${reportId}`, MARGIN, 26);

  setText(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(es.resultsTitle, PAGE_W - MARGIN, 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setText(doc, C.slate400);
  doc.text(formatDateTime(screenedAt), PAGE_W - MARGIN, 18, { align: 'right' });

  doc.setFontSize(6.5);
  doc.text(es.resultsSubtitle, PAGE_W - MARGIN, 24, { align: 'right' });

  return 42;
}

type MetaField = { label: string; value: string };

function collectStudyFields(
  opts: PdfExportOptions,
  filename: string,
): MetaField[] {
  const fields: MetaField[] = [];
  const study = opts.sourceLabel || filename;
  fields.push({ label: es.source, value: study });
  if (opts.sourceKind) fields.push({ label: es.studyMetaSource, value: opts.sourceKind });
  fields.push({ label: es.pdfScreenedAt, value: formatDateTime(opts.screenedAt) });

  const dicom = opts.dicomMetadata;
  if (dicom) {
    if (dicom.patient_id) fields.push({ label: es.studyMetaPatient, value: dicom.patient_id });
    if (dicom.patient_age) fields.push({ label: es.studyMetaAge, value: dicom.patient_age });
    if (dicom.patient_sex) fields.push({ label: es.studyMetaGender, value: dicom.patient_sex });
    if (dicom.view_position) fields.push({ label: es.studyMetaView, value: dicom.view_position });
    if (dicom.study_date) fields.push({ label: es.dicomStudyDate, value: dicom.study_date });
    if (dicom.modality) fields.push({ label: es.dicomModality, value: dicom.modality });
  } else if (opts.metadata) {
    if (opts.metadata.patient_id) {
      fields.push({ label: es.studyMetaPatient, value: opts.metadata.patient_id });
    }
    if (opts.metadata.age) fields.push({ label: es.studyMetaAge, value: opts.metadata.age });
    if (opts.metadata.gender) fields.push({ label: es.studyMetaGender, value: opts.metadata.gender });
    if (opts.metadata.view_position) {
      fields.push({ label: es.studyMetaView, value: opts.metadata.view_position });
    }
  }
  return fields;
}

function drawStudyPanel(
  doc: jsPDF,
  y: number,
  opts: PdfExportOptions,
  filename: string,
  thumbDataUrl: string | null,
): number {
  const thumbW = 46;
  const thumbH = 46;
  const fields = collectStudyFields(opts, filename);
  const rows = Math.ceil(Math.min(fields.length, 6) / 2);
  const panelH = thumbDataUrl ? Math.max(54, 22 + rows * 9) : 22 + rows * 9;
  y = ensureSpace(doc, y, panelH + 4);

  setFill(doc, C.slate50);
  setDraw(doc, C.slate200);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN, y, CONTENT_W, panelH, 3, 3, 'FD');

  const innerX = MARGIN + 6;
  let textX = innerX;
  const textW = CONTENT_W - 12;

  if (thumbDataUrl) {
    setFill(doc, C.white);
    setDraw(doc, C.slate200);
    doc.roundedRect(innerX, y + 4, thumbW, thumbH, 2, 2, 'FD');
    doc.addImage(thumbDataUrl, 'JPEG', innerX + 1, y + 5, thumbW - 2, thumbH - 2);
    textX = innerX + thumbW + 8;
  }

  const colW = (textW - (thumbDataUrl ? thumbW + 14 : 0)) / 2;
  const baseY = y + 8;
  fields.slice(0, 6).forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const fx = textX + col * colW;
    const fy = baseY + row * 9;
    setText(doc, C.slate500);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(f.label, fx, fy);
    setText(doc, C.slate700);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(wrapText(doc, f.value, colW - 2).slice(0, 2), fx, fy + 4);
  });

  return y + panelH + 8;
}

function drawTriageStrip(doc: jsPDF, y: number, flagged: boolean): number {
  const h = 22;
  y = ensureSpace(doc, y, h + 6);

  if (flagged) {
    setFill(doc, C.amberBg);
    setDraw(doc, C.amberBorder);
    setFill(doc, C.amberBorder);
  } else {
    setFill(doc, C.emeraldBg);
    setDraw(doc, C.emeraldBorder);
    setFill(doc, C.emeraldBorder);
  }
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 2.5, 2.5, 'FD');
  doc.rect(MARGIN, y + 1.5, 3, h - 3, 'F');

  const title = flagged ? es.overallReview : es.overallRoutine;
  const desc = flagged ? es.overallReviewDesc : es.overallRoutineDesc;
  const titleColor = flagged ? C.amberText : C.emeraldText;

  setText(doc, titleColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, MARGIN + 7, y + 9);

  setText(doc, C.slate700);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const descLines = wrapText(doc, desc, CONTENT_W - 14);
  doc.text(descLines[0] ?? '', MARGIN + 7, y + 16);

  return y + h + 10;
}

function drawClinicalNotes(doc: jsPDF, y: number, draft: ReportDraft | undefined): number {
  if (!draft) return y;
  const hasContent =
    draft.impression.trim() || draft.recommendations.trim() || draft.clinicianName.trim();
  if (!hasContent) return y;

  y = drawSectionTitle(doc, y, es.pdfClinicalSection);

  const impressionLines = draft.impression.trim()
    ? wrapText(doc, draft.impression.trim(), CONTENT_W - 14)
    : [];
  const recLines = draft.recommendations.trim()
    ? wrapText(doc, draft.recommendations.trim(), CONTENT_W - 14)
    : [];
  const blockH = 16 + impressionLines.length * 4 + recLines.length * 4 + (draft.clinicianName ? 10 : 0);
  y = ensureSpace(doc, y, blockH);

  setFill(doc, C.slate50);
  setDraw(doc, C.slate200);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2.5, 2.5, 'FD');

  let innerY = y + 7;
  const ix = MARGIN + 6;

  if (draft.impression.trim()) {
    setText(doc, C.slate500);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(es.reportImpression.toUpperCase(), ix, innerY);
    innerY += 5;
    setText(doc, C.navy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(impressionLines, ix, innerY);
    innerY += impressionLines.length * 4 + 4;
  }

  if (draft.recommendations.trim()) {
    setText(doc, C.slate500);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(es.reportRecommendations.toUpperCase(), ix, innerY);
    innerY += 5;
    setText(doc, C.navy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(recLines, ix, innerY);
    innerY += recLines.length * 4 + 4;
  }

  if (draft.clinicianName.trim()) {
    setDraw(doc, C.slate200);
    doc.line(ix, innerY - 1, MARGIN + CONTENT_W - 6, innerY - 1);
    setText(doc, C.slate500);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`${es.reportClinician}:`, ix, innerY + 3);
    setText(doc, C.navy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(draft.clinicianName.trim(), ix + 32, innerY + 3);
  }

  return y + blockH + 10;
}

function drawProbabilityBar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  pct: number,
  thresh: number,
  flagged: boolean,
) {
  const h = 2.8;
  setFill(doc, C.slate200);
  doc.roundedRect(x, y, w, h, 1, 1, 'F');
  const fillW = (w * Math.min(pct, 100)) / 100;
  if (fillW > 0) {
    setFill(doc, flagged ? [245, 158, 11] : [16, 185, 129]);
    doc.roundedRect(x, y, fillW, h, 1, 1, 'F');
  }
  const threshX = x + (w * thresh) / 100;
  setDraw(doc, C.navy);
  doc.setLineWidth(0.35);
  doc.line(threshX, y - 0.4, threshX, y + h + 0.4);
}

function drawFindingsTable(
  doc: jsPDF,
  y: number,
  results: ScreeningResponse['results'],
): number {
  y = drawSectionTitle(doc, y, es.pdfFindingsTable);

  const rowH = 11;
  const headerH = 9;
  const tableH = headerH + results.length * rowH + 2;
  y = ensureSpace(doc, y, tableH + 4);

  setDraw(doc, C.slate200);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN, y, CONTENT_W, tableH, 2, 2, 'D');

  const cols = {
    condition: MARGIN + 4,
    prob: MARGIN + CONTENT_W * 0.36,
    bar: MARGIN + CONTENT_W * 0.48,
    thresh: MARGIN + CONTENT_W * 0.78,
    status: MARGIN + CONTENT_W * 0.88,
  };
  const barW = CONTENT_W * 0.26;

  setFill(doc, C.navy);
  doc.roundedRect(MARGIN, y, CONTENT_W, headerH, 2, 2, 'F');
  doc.rect(MARGIN, y + headerH - 2, CONTENT_W, 2, 'F');

  setText(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(es.pdfColCondition, cols.condition, y + 5.5);
  doc.text(es.pdfColProbability, cols.prob, y + 5.5);
  doc.text(es.pdfColThreshold, cols.thresh, y + 5.5);
  doc.text(es.pdfColStatus, cols.status, y + 5.5);
  y += headerH;

  results.forEach((r, i) => {
    if (i % 2 === 1) {
      setFill(doc, C.slate50);
      doc.rect(MARGIN + 0.5, y, CONTENT_W - 1, rowH, 'F');
    }

    const pct = Math.round(r.probability * 100);
    const thresh = Math.round(r.threshold * 100);

    setText(doc, C.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(r.condition_label, cols.condition, y + 6);

    setText(doc, C.slate700);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`${pct}%`, cols.prob, y + 6);

    drawProbabilityBar(doc, cols.bar, y + 4.2, barW, pct, thresh, r.flagged);

    setText(doc, C.slate500);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`${thresh}%`, cols.thresh, y + 6);

    const status = r.flagged ? es.flagged : es.notFlagged;
    if (r.flagged) {
      setFill(doc, C.amberBg);
      setText(doc, C.amberText);
    } else {
      setFill(doc, C.emeraldBg);
      setText(doc, C.emeraldText);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    const badgeW = doc.getTextWidth(status) + 5;
    doc.roundedRect(cols.status - 1, y + 3.5, badgeW, 5.5, 1.5, 1.5, 'F');
    doc.text(status, cols.status + 1, y + 7);

    y += rowH;
  });

  return y + 10;
}

function drawHeatmapsSection(
  doc: jsPDF,
  y: number,
  results: ScreeningResponse['results'],
): number {
  const withHeatmaps = results.filter((r) => r.heatmap_data_url);
  if (withHeatmaps.length === 0) return y;

  y = drawSectionTitle(doc, y, es.pdfHeatmapsSection);

  const cols = withHeatmaps.length > 1 ? 2 : 1;
  const gap = 4;
  const cellW = (CONTENT_W - gap * (cols - 1)) / cols;
  const imgH = 36;
  const cellH = imgH + 14;

  for (let i = 0; i < withHeatmaps.length; i += cols) {
    y = ensureSpace(doc, y, cellH + 4);

    for (let col = 0; col < cols; col++) {
      const idx = i + col;
      if (idx >= withHeatmaps.length) break;

      const x = MARGIN + col * (cellW + gap);
      const result = withHeatmaps[idx];

      setFill(doc, C.white);
      setDraw(doc, C.slate200);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, y, cellW, cellH, 2, 2, 'FD');
      doc.addImage(result.heatmap_data_url!, 'JPEG', x + 2, y + 2, cellW - 4, imgH);

      setText(doc, C.navy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(result.condition_label, x + 3, y + imgH + 7);

      setText(doc, C.slate400);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(es.pdfHeatmapNote, x + 3, y + imgH + 11);
    }

    y += cellH + 6;
  }

  return y;
}

function drawFindingDetails(
  doc: jsPDF,
  y: number,
  results: ScreeningResponse['results'],
): number {
  y = drawSectionTitle(doc, y, es.pdfFindingDetails);

  for (const result of results) {
    const recLines = wrapText(doc, result.recommendation, CONTENT_W - 16);
    const cardH = 28 + recLines.length * 4;
    y = ensureSpace(doc, y, cardH + 4);

    setFill(doc, C.white);
    setDraw(doc, C.slate200);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 2.5, 2.5, 'FD');

    const accent = result.flagged ? C.amberBorder : C.emeraldBorder;
    setFill(doc, accent);
    doc.rect(MARGIN, y + 2, 2.5, cardH - 4, 'F');

    const ix = MARGIN + 7;
    const pct = Math.round(result.probability * 100);
    const thresh = Math.round(result.threshold * 100);

    setText(doc, C.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(result.condition_label, ix, y + 9);

    setText(doc, C.slate500);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`${es.probability}: ${pct}%  ·  ${es.thresholdLabel}: ${thresh}%`, ix, y + 15);

    drawProbabilityBar(doc, ix, y + 17.5, CONTENT_W - 14, pct, thresh, result.flagged);

    setText(doc, C.slate700);
    doc.setFontSize(8);
    doc.text(recLines, ix, y + 23);

    y += cardH + 5;
  }

  return y;
}

function drawSignatureBlock(
  doc: jsPDF,
  y: number,
  draft: ReportDraft | undefined,
  clinicallyReviewed: boolean,
  screenedAt?: string,
): number {
  const name = draft?.clinicianName?.trim();
  if (!name && !clinicallyReviewed) return y;

  const blockH = 28;
  y = ensureSpace(doc, y, blockH + 8);

  setFill(doc, C.slate50);
  setDraw(doc, C.slate200);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2.5, 2.5, 'FD');

  const ix = MARGIN + 8;
  let innerY = y + 8;

  if (clinicallyReviewed) {
    setFill(doc, C.emeraldBg);
    setText(doc, C.emeraldText);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    const badge = es.pdfReviewedBadge;
    const bw = doc.getTextWidth(badge) + 6;
    doc.roundedRect(ix, innerY - 4, bw, 6, 1.5, 1.5, 'F');
    doc.text(badge, ix + 3, innerY);
    innerY += 8;
  }

  setText(doc, C.slate500);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(es.pdfSignature, ix, innerY);

  setDraw(doc, C.slate400);
  doc.setLineWidth(0.4);
  doc.line(ix, innerY + 10, ix + 70, innerY + 10);

  if (name) {
    setText(doc, C.navy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(name, ix, innerY + 8);
  }

  setText(doc, C.slate500);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    `${es.pdfSignatureDate}: ${formatDateTime(screenedAt)}`,
    PAGE_W - MARGIN - 8,
    innerY + 8,
    { align: 'right' },
  );

  return y + blockH + 10;
}

function drawFooter(doc: jsPDF, reportId: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    setFill(doc, C.slate50);
    doc.rect(0, PAGE_H - FOOTER_H, PAGE_W, FOOTER_H, 'F');
    setDraw(doc, C.slate200);
    doc.setLineWidth(0.3);
    doc.line(0, PAGE_H - FOOTER_H, PAGE_W, PAGE_H - FOOTER_H);

    setText(doc, C.slate500);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(`${es.pdfReportVersion} · ${reportId}`, MARGIN, PAGE_H - 15);

    setText(doc, C.slate400);
    doc.setFontSize(5.5);
    const disclaimerLines = wrapText(doc, es.disclaimer, CONTENT_W - 30);
    doc.text(disclaimerLines.slice(0, 2), MARGIN, PAGE_H - 10);

    setText(doc, C.slate500);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`${es.productName}  ·  ${i} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 10, {
      align: 'right',
    });
  }
}

export async function generateScreeningPdf(
  response: ScreeningResponse,
  options: PdfExportOptions = {},
): Promise<void> {
  const thumbDataUrl = options.imageUrl
    ? await imageToPdfDataUrl(options.imageUrl)
    : response.preview_data_url ?? null;

  const reportId = makeReportId(response.filename, options.screenedAt);
  const clinicallyReviewed = options.clinicallyReviewed ?? false;
  const dicomMetadata = options.dicomMetadata ?? response.dicom_metadata ?? null;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  let y = drawHeader(doc, reportId, options.screenedAt);
  y = drawStudyPanel(doc, y, { ...options, dicomMetadata }, response.filename, thumbDataUrl);
  y = drawTriageStrip(doc, y, response.overall_flagged);
  y = drawClinicalNotes(doc, y, options.reportDraft);
  y = drawFindingsTable(doc, y, response.results);
  y = drawHeatmapsSection(doc, y, response.results);
  y = drawFindingDetails(doc, y, response.results);
  y = drawSignatureBlock(doc, y, options.reportDraft, clinicallyReviewed, options.screenedAt);

  drawFooter(doc, reportId);

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
