import { API_BASE_URL } from '../api.js';
export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
// All FastAPI traffic goes through this function. Tokens never go in URLs.
export function createHttp({ getAccessToken, fetchImpl = fetch, baseUrl = API_BASE_URL }) {
  return async function request(path, { body, method = 'GET', signal, pdf = false } = {}) {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('API paths must be relative to the configured FastAPI service.');
    const token = await getAccessToken();
    if (!token) throw new ApiError('Your session has expired. Please sign in again.', 401);
    const headers = { Authorization: `Bearer ${token}` };
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    let response;
    try { response = await fetchImpl(`${baseUrl}${path}`, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, signal, cache: 'no-store', redirect: 'error' }); }
    catch (error) { if (error.name === 'AbortError') throw error; throw new ApiError('The application API could not be reached. Please retry.'); }
    if (!response.ok) {
      let detail;
      try { detail = (await response.json()).detail; } catch { /* use status fallback */ }
      const message = typeof detail === 'string' ? detail : detail != null ? JSON.stringify(detail) : response.statusText || 'Request failed';
      throw new ApiError(response.status === 401 ? 'Your session was rejected. Please sign in again.' : response.status === 403 ? 'You do not have access to this resource.' : `HTTP ${response.status}: ${message}`, response.status);
    }
    if (pdf) {
      const blob = await response.blob();
      if (!(await blob.slice(0, 5).text()).startsWith('%PDF-')) throw new ApiError('The source endpoint did not return a PDF.');
      return new Blob([blob], { type: 'application/pdf' });
    }
    if (response.status === 204) return null;
    try { return await response.json(); } catch { throw new ApiError('Response format not recognized'); }
  };
}
