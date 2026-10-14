// Free Pages custom domains terminate HTTPS here. The backend resolves the
// original hostname to its verified, published website and stores form responses.
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  const formPath = url.pathname === '/api/forms' || /^\/sites\/[a-zA-Z0-9-]+\/api\/forms$/.test(url.pathname);
  const form = formPath && request.method === 'POST';
  const page = ['GET', 'HEAD'].includes(request.method) && !url.pathname.startsWith('/api/') && url.pathname !== '/health';
  if (!page && !form) return new Response('Not found', {status: 404});
  const headers = new Headers(request.headers);
  headers.delete('Authorization');
  headers.delete('Cookie');
  headers.delete('oai-authenticated-user-id');
  headers.delete('oai-authenticated-user-email');
  const response = await env.HWS_BACKEND.fetch(new Request(request, {headers}));
  if (response.status === 401 || response.status === 403) return new Response('Website unavailable', {status: 404, headers: {'Cache-Control': 'no-store'}});
  return response;
 }
};
