export const FILE_LIMIT = 10 * 1024 * 1024;
export async function checkPdfFiles(incoming, existing = []) {
  const accepted = [...existing], errors = [];
  for (const file of incoming) {
    if (!/\.pdf$/i.test(file.name)) { errors.push(`${file.name}: only PDF documents are supported.`); continue; }
    if (file.size > FILE_LIMIT) { errors.push(`${file.name}: exceeds the 10 MB per-file limit.`); continue; }
    if (!(await file.slice(0, 5).text()).startsWith('%PDF-')) { errors.push(`${file.name}: the file does not have a readable PDF header.`); continue; }
    if (accepted.length >= 3) { errors.push('A maximum of 3 PDF documents can be selected.'); continue; }
    accepted.push(file);
  }
  return { files: accepted, errors: [...new Set(errors)] };
}
