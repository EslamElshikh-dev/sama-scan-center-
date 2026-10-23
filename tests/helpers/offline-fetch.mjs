// Preload during local/CI builds. Public-content fetches use their existing
// safe fallback; no build-time request may reach the operational backend.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return originalFetch(input, options);
  return Promise.reject(new Error('External fetch disabled during offline verification build'));
};
