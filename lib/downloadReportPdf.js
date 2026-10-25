const COLORS = {
  ink: [17, 25, 54],
  black: [17, 17, 17],
  muted: [90, 102, 133],
  border: [221, 226, 238],
  panel: [246, 248, 252],
  gold: [245, 181, 10],
  green: [5, 150, 105],
  amber: [217, 119, 6],
  red: [225, 29, 72],
  white: [255, 255, 255],
};

const cleanText = (value) => String(value ?? '')
  .replace(/[–—−]/g, '-')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[…]/g, '...')
  .replace(/[•▪●]/g, '-')
  .replace(/[^\x20-\xFF]/g, '?')
  .replace(/\s+/g, ' ')
  .trim();

const scoreColor = (score) => (score >= 75 ? COLORS.green : score >= 50 ? COLORS.amber : COLORS.red);

export async function downloadReportPdf(report) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 54;
  let y = 94;

  const setColor = (method, color) => pdf[method](...color);

  const drawPageHeader = () => {
    setColor('setFillColor', COLORS.black);
    pdf.rect(0, 0, pageWidth, 62, 'F');
    setColor('setFillColor', COLORS.gold);
    pdf.rect(0, 62, pageWidth, 4, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    setColor('setTextColor', COLORS.white);
    pdf.text('ResumeLens', margin, 37);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setColor('setTextColor', [220, 224, 235]);
    pdf.text('RESUME ANALYSIS REPORT', pageWidth - margin, 36, { align: 'right' });
  };

  const addPage = () => {
    pdf.addPage();
    drawPageHeader();
    y = 92;
  };

  const ensureSpace = (height) => {
    if (y + height > bottomLimit) addPage();
  };

  const paragraph = (value, { bold = false, indent = 0, fontSize = 9.5, color = COLORS.ink, gap = 5 } = {}) => {
    const text = cleanText(value);
    if (!text) return;
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    setColor('setTextColor', color);
    const lines = pdf.splitTextToSize(text, contentWidth - indent);
    const lineHeight = fontSize * 1.45;
    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(line, margin + indent, y);
      y += lineHeight;
    }
    y += gap;
  };

  const sectionHeading = (title, subtitle = '') => {
    ensureSpace(34);
    y += 11;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    setColor('setTextColor', COLORS.ink);
    pdf.text(cleanText(title).toUpperCase(), margin, y);
    if (subtitle) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setColor('setTextColor', COLORS.muted);
      pdf.text(cleanText(subtitle), pageWidth - margin, y, { align: 'right' });
    }
    y += 8;
    setColor('setDrawColor', COLORS.border);
    pdf.setLineWidth(0.7);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 15;
  };

  const drawScoreCard = (x, top, width, label, score) => {
    const height = 62;
    setColor('setFillColor', COLORS.panel);
    setColor('setDrawColor', COLORS.border);
    pdf.setLineWidth(0.65);
    pdf.roundedRect(x, top, width, height, 8, 8, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setColor('setTextColor', COLORS.muted);
    pdf.text(cleanText(label).toUpperCase(), x + 12, top + 19);
    pdf.setFontSize(15);
    setColor('setTextColor', score == null ? COLORS.muted : scoreColor(score));
    pdf.text(score == null ? 'N/A' : `${score}`, x + width - 12, top + 21, { align: 'right' });
    if (score != null) {
      const barX = x + 12;
      const barY = top + 39;
      const barWidth = width - 24;
      setColor('setFillColor', COLORS.border);
      pdf.roundedRect(barX, barY, barWidth, 5, 2.5, 2.5, 'F');
      setColor('setFillColor', scoreColor(score));
      pdf.roundedRect(barX, barY, Math.max(5, barWidth * Math.max(0, Math.min(100, score)) / 100), 5, 2.5, 2.5, 'F');
    }
  };

  const drawPills = (items, color, fill) => {
    if (!items?.length) {
      paragraph('None', { color: COLORS.muted });
      return;
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    let x = margin;
    const gap = 7;
    const pillHeight = 21;
    for (const raw of items) {
      const label = cleanText(raw);
      const width = Math.min(pdf.getTextWidth(label) + 18, contentWidth);
      if (x + width > pageWidth - margin) {
        x = margin;
        y += pillHeight + 7;
      }
      ensureSpace(pillHeight + 2);
      setColor('setFillColor', fill);
      setColor('setDrawColor', color);
      pdf.setLineWidth(0.55);
      pdf.roundedRect(x, y - 13, width, pillHeight, 8, 8, 'FD');
      setColor('setTextColor', color);
      pdf.text(label, x + 9, y + 1);
      x += width + gap;
    }
    y += 17;
  };

  const drawCheck = (item) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    const label = cleanText(item.label);
    const labelLines = pdf.splitTextToSize(label, contentWidth - 34);
    const tipLines = !item.pass && item.tip
      ? pdf.splitTextToSize(cleanText(item.tip), contentWidth - 34)
      : [];
    const height = Math.max(29, labelLines.length * 12 + tipLines.length * 11 + 11);
    ensureSpace(height);
    const top = y - 11;
    setColor('setFillColor', COLORS.panel);
    setColor('setDrawColor', COLORS.border);
    pdf.roundedRect(margin, top, contentWidth, height, 6, 6, 'FD');
    setColor('setFillColor', item.pass ? COLORS.green : COLORS.red);
    pdf.circle(margin + 14, top + 15, 5, 'F');
    setColor('setTextColor', COLORS.white);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.text(item.pass ? 'OK' : '!', margin + 14, top + 17, { align: 'center' });
    pdf.setFontSize(9);
    setColor('setTextColor', COLORS.ink);
    pdf.text(labelLines, margin + 27, y);
    y += labelLines.length * 12;
    if (tipLines.length) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setColor('setTextColor', COLORS.muted);
      pdf.text(tipLines, margin + 27, y);
      y += tipLines.length * 11;
    }
    y = top + height + 6;
  };

  const drawBulletCard = (item, index) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const originalLines = pdf.splitTextToSize(cleanText(item.original), contentWidth - 30);
    const improvedLines = pdf.splitTextToSize(cleanText(item.improved), contentWidth - 30);
    const reasonLines = item.reason ? pdf.splitTextToSize(cleanText(item.reason), contentWidth - 30) : [];
    const height = 65 + (originalLines.length + improvedLines.length) * 12 + reasonLines.length * 10;
    ensureSpace(Math.min(height, bottomLimit - 92));
    const top = y - 12;
    setColor('setFillColor', COLORS.white);
    setColor('setDrawColor', COLORS.border);
    pdf.setLineWidth(0.7);
    pdf.roundedRect(margin, top, contentWidth, height, 7, 7, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setColor('setTextColor', COLORS.muted);
    pdf.text(`IMPROVEMENT ${String(index + 1).padStart(2, '0')}`, margin + 14, y + 1);
    if (item.score != null) {
      setColor('setTextColor', scoreColor(item.score));
      pdf.text(`Original strength: ${item.score}/100`, pageWidth - margin - 14, y + 1, { align: 'right' });
    }
    y += 18;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setColor('setTextColor', COLORS.muted);
    pdf.text('ORIGINAL', margin + 14, y);
    y += 12;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setColor('setTextColor', COLORS.ink);
    pdf.text(originalLines, margin + 14, y);
    y += originalLines.length * 12 + 8;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setColor('setTextColor', COLORS.green);
    pdf.text('SUGGESTED REWRITE', margin + 14, y);
    y += 12;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setColor('setTextColor', COLORS.ink);
    pdf.text(improvedLines, margin + 14, y);
    y += improvedLines.length * 12;
    if (reasonLines.length) {
      y += 7;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      setColor('setTextColor', COLORS.muted);
      pdf.text(reasonLines, margin + 14, y);
      y += reasonLines.length * 10;
    }
    y = top + height + 12;
  };

  pdf.setProperties({
    title: `ResumeLens report - ${cleanText(report.fileName)}`,
    subject: 'Resume analysis report',
    author: 'ResumeLens',
  });
  drawPageHeader();

  const title = cleanText(report.fileName || 'Resume analysis');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  setColor('setTextColor', COLORS.ink);
  const titleLines = pdf.splitTextToSize(title, contentWidth - 154);
  const createdAt = report.createdAt ? new Date(report.createdAt) : null;
  const dateText = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toLocaleDateString() : '';
  pdf.text(titleLines, margin, y + 3);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  setColor('setTextColor', COLORS.muted);
  if (dateText) pdf.text(dateText, margin, y + titleLines.length * 21 + 4);

  const score = Math.max(0, Math.min(100, Number(report.score) || 0));
  const scoreX = pageWidth - margin - 128;
  setColor('setFillColor', COLORS.black);
  pdf.roundedRect(scoreX, y - 11, 128, 84, 10, 10, 'F');
  setColor('setFillColor', COLORS.gold);
  pdf.roundedRect(scoreX, y - 11, 5, 84, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(27);
  setColor('setTextColor', COLORS.white);
  pdf.text(`${score}`, scoreX + 17, y + 20);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  setColor('setTextColor', [220, 224, 235]);
  pdf.text('/ 100 ATS SCORE', scoreX + 61, y + 19);
  const verdict = score >= 80 ? 'Strong match' : score >= 65 ? 'Good, with gaps' : score >= 45 ? 'Needs work' : 'Unlikely to pass';
  pdf.setFont('helvetica', 'bold');
  setColor('setTextColor', COLORS.gold);
  pdf.text(verdict, scoreX + 17, y + 47);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  setColor('setTextColor', [220, 224, 235]);
  pdf.text(report.hasJob ? 'Compared with job posting' : 'General resume review', scoreX + 17, y + 62);

  y += Math.max(93, titleLines.length * 21 + 23);

  sectionHeading('Score at a glance', 'Scores out of 100');
  const metrics = [
    ['Keyword match', report.breakdown?.keywords],
    ['Sections', report.breakdown?.sections],
    ['Bullet strength', report.breakdown?.bullets],
    ['Formatting', report.breakdown?.format],
  ];
  const cardGap = 10;
  const cardWidth = (contentWidth - cardGap) / 2;
  metrics.forEach(([label, value], index) => {
    const row = Math.floor(index / 2);
    const column = index % 2;
    const x = margin + column * (cardWidth + cardGap);
    const top = y + row * 70;
    drawScoreCard(x, top, cardWidth, label, value == null ? null : Number(value));
  });
  y += 148;

  sectionHeading('Resume sections', 'Detected from your resume');
  for (const item of report.sections || []) {
    const color = item.found ? COLORS.green : COLORS.red;
    paragraph(`${item.found ? 'FOUND' : 'MISSING'}  ${item.name}${item.required ? ' - Required' : ' - Optional'}  |  Score: ${item.score}/100`, {
      bold: true, fontSize: 9, color, gap: 3,
    });
  }

  sectionHeading('ATS checklist');
  for (const item of report.checks || []) drawCheck(item);
  if (report.stats) {
    y += 5;
    paragraph(`${report.stats.words} words   |   About ${report.stats.pages} page(s)   |   ${report.stats.strongBullets} of ${report.stats.bulletCount} bullets are strong`, {
      fontSize: 8.5, color: COLORS.muted,
    });
  }

  sectionHeading('Keyword match', `${report.matched?.length || 0} matched  |  ${report.missing?.length || 0} missing`);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  setColor('setTextColor', COLORS.green);
  pdf.text('MATCHED', margin, y);
  y += 12;
  drawPills(report.matched, COLORS.green, [233, 247, 241]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  setColor('setTextColor', COLORS.red);
  pdf.text('MISSING', margin, y);
  y += 12;
  drawPills(report.missing, COLORS.red, [253, 238, 241]);
  if (!report.hasJob) paragraph('Add a job description during analysis to see role-specific keyword matches.', { fontSize: 8, color: COLORS.muted });

  sectionHeading('Bullet improvements', `${report.bullets?.length || 0} suggestions`);
  if (report.bullets?.length) {
    report.bullets.forEach((item, index) => drawBulletCard(item, index));
  } else {
    paragraph('No bullet improvements are available for this resume.');
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    setColor('setDrawColor', COLORS.border);
    pdf.setLineWidth(0.6);
    pdf.line(margin, pageHeight - 42, pageWidth - margin, pageHeight - 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setColor('setTextColor', COLORS.muted);
    pdf.text('ResumeLens  |  Private resume analysis', margin, pageHeight - 26);
    pdf.text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 26, { align: 'right' });
  }

  const baseName = cleanText(report.fileName || 'resume').replace(/\.pdf$/i, '').replace(/[<>:"/\\|?*]/g, '').trim() || 'resume';
  pdf.save(`ResumeLens-${baseName}.pdf`);
}
