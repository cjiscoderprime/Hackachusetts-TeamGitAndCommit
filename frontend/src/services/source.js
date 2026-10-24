import { ApiError } from './http.js';
// Fetch a new grant on every open. Never cache a signed URL or attach the user token to it.
export async function fetchSourcePdf(request, documentId, { path, signal, fetchImpl = fetch } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const grant = await request(path, { signal });
    if (!grant || grant.document_id !== documentId || typeof grant.filename !== 'string' || !Number.isFinite(grant.expires_in) || grant.expires_in <= 0) throw new ApiError('Source document response format not recognized.');
    let url;
    try { url = new URL(grant.url); } catch { throw new ApiError('The source URL is invalid.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new ApiError('The source URL must be a secure HTTPS URL.');
    let response;
    try { response = await fetchImpl(url.href, { signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'error' }); }
    catch (error) { if (error.name === 'AbortError') throw error; throw new ApiError('The source PDF could not be retrieved. Please reopen the document to request a fresh link.'); }
    // A grant can expire between issuance and retrieval. Renew once, then show an error.
    if ((response.status === 401 || response.status === 403) && attempt === 0) continue;
    if (!response.ok) throw new ApiError('The source link was rejected or expired. Please retry to request a fresh link.', response.status);
    const blob = await response.blob();
    if (!(await blob.slice(0, 5).text()).startsWith('%PDF-')) throw new ApiError('The source URL did not return a PDF.');
    return new Blob([blob], { type: 'application/pdf' });
  }
}
