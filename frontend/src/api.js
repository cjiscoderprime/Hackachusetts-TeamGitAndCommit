import flawed from './mocks/flawed.json' with { type: 'json' };
import corrected from './mocks/corrected.json' with { type: 'json' };
export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
export const MOCK_MODE = import.meta.env?.VITE_USE_MOCK === 'true';
export const severityGroup = value => ['high','medium','low'].includes(String(value).toLowerCase()) ? String(value).toLowerCase() : 'Other';
export const groups = ['high', 'medium', 'low', 'Other'];
export function counts(result) { return Object.fromEntries(groups.map(group => [group, result.findings.filter(f => severityGroup(f.severity) === group).length])); }
export function validateResponse(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Response format not recognized');
  if (body.status === 'completed') {
    if (!Number.isInteger(body.documents_analyzed) || body.documents_analyzed < 0 || !Array.isArray(body.findings) || body.findings.some(f => !f || typeof f !== 'object' || Array.isArray(f) || (f.sources != null && (!Array.isArray(f.sources) || f.sources.some(s => !s || typeof s !== 'object' || Array.isArray(s)))))) throw new Error('Response format not recognized');
  } else if (body.status === 'extracted_only') {
    if (!Array.isArray(body.documents) || body.documents.some(d => !d || typeof d !== 'object' || !Array.isArray(d.pages))) throw new Error('Response format not recognized');
  } else throw new Error(`Unsupported response status: ${JSON.stringify(body.status) ?? 'undefined'}`);
  return body;
}
export async function analyze(files, fixture, options = {}) {
  const mock = options.mock ?? MOCK_MODE;
  if (mock) { await new Promise(resolve => setTimeout(resolve, 650)); return validateResponse(structuredClone(fixture === 'corrected' ? corrected : flawed)); }
  const form = new FormData(); files.forEach(file => form.append('files', file));
  let response;
  try { response = await (options.fetchImpl || fetch)(`${API_BASE_URL}/analyze`, { method: 'POST', body: form, ...(options.accessToken ? { headers: { Authorization: `Bearer ${options.accessToken}` } } : {}) }); }
  catch { throw new Error(`Backend could not be reached at ${API_BASE_URL}. Check that the API is running and CORS permits http://localhost:5173.`); }
  if (!response.ok) {
    let detail; try { detail = (await response.json()).detail; } catch { /* HTTP fallback */ }
    const readable = typeof detail === 'string' ? detail : detail != null ? JSON.stringify(detail) : response.statusText || 'Request failed';
    throw new Error(`HTTP ${response.status}: ${readable}`);
  }
  let body; try { body = await response.json(); } catch { throw new Error('Response format not recognized'); }
  return validateResponse(body);
}
export function serializeReport(result) { return JSON.stringify(result, null, 2); }
