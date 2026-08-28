async function req(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? `${res.status} ${res.statusText}`);
  return body;
}

export const api = {
  health:     ()   => req('/api/health'),
  businesses: ()   => req('/api/businesses'),
  business:   (id) => req(`/api/businesses/${id}`),
  check:      (payload) => req('/api/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }),
};
