// Small valid PDF fixture generator. This creates fictional demo documents, not analysis results.
export function makeDemoPdf(lines) {
  const escape = s => s.replace(/[^\x20-\x7E]/g, '?').replace(/([\\()])/g, '\\$1');
  const wrapped = lines.flatMap(line => line.match(/.{1,78}(?:\s|$)|\S+/g)?.map(s=>s.trim()) || ['']);
  const stream = `BT /F1 11 Tf 48 745 Td ${wrapped.map((line, i) => `${i ? '0 -20 Td ' : ''}(${escape(line)}) Tj`).join('\n')} ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([pdf], { type: 'application/pdf' });
}
export const demoDocumentLines = {
  'scientific-summary.pdf': ['FICTIONAL SYNTHETIC DOCUMENT - BioLyze demo', 'Scientific summary', 'Model RL-01 v1.2 achieved sensitivity of 0.81 on the SYN-240 held-out cohort at a threshold of 0.50.', 'The model generalizes reliably across external hospitals.'],
  'model-validation.pdf': ['FICTIONAL SYNTHETIC DOCUMENT - BioLyze demo', 'Model validation', 'Model RL-01 v1.2: sensitivity 0.91 on SYN-240 held-out cohort; threshold 0.50.', 'Evaluation was internal only.'],
  'results-table.pdf': ['FICTIONAL SYNTHETIC DOCUMENT - BioLyze demo', 'Results table', 'RL-01 v1.2 | SYN-240 | threshold 0.50 | sensitivity 0.91'],
};
export function demoFiles() { return Object.entries(demoDocumentLines).map(([name, lines]) => new File([makeDemoPdf(lines)], name, { type: 'application/pdf' })); }
