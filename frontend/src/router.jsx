import React, { useEffect, useState } from 'react';
export function navigate(path, { replace = false } = {}) {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid application route');
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
  window.dispatchEvent(new Event('regulens:navigate'));
}
export function useRoute() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update); window.addEventListener('regulens:navigate', update);
    return () => { window.removeEventListener('popstate', update); window.removeEventListener('regulens:navigate', update); };
  }, []);
  return path;
}
export function Link({ to, children, ...props }) {
  return <a {...props} href={to} onClick={event => {
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(to); }
  }}>{children}</a>;
}
