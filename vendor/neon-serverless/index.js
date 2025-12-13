import { Buffer } from 'node:buffer';

export const neonConfig = { fetchConnectionCache: true };

function buildQuery(strings, values) {
  let text = '';
  const params = [];
  strings.forEach((chunk, idx) => {
    text += chunk;
    if (idx < values.length) {
      params.push(values[idx]);
      text += `$${idx + 1}`;
    }
  });
  return { text, params };
}

function buildEndpoint(url) {
  const protocol = url.protocol === 'postgres:' ? 'https:' : url.protocol;
  const host = url.host;
  return `${protocol}//${host}/sql`;
}

function buildAuth(url) {
  if (!url.username && !url.password) return undefined;
  const user = decodeURIComponent(url.username || '');
  const pass = decodeURIComponent(url.password || '');
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

export function neon(connectionString) {
  const url = new URL(connectionString);
  const endpoint = buildEndpoint(url);
  const auth = buildAuth(url);
  const database = url.pathname?.replace(/^\//, '') || undefined;

  return async (strings, ...values) => {
    const { text, params } = buildQuery(strings, values);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify({ query: text, params, database }),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      throw new Error(`Neon HTTP error ${res.status}: ${bodyText}`);
    }
    const data = await res.json().catch(() => ({}));
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      if (Array.isArray(data.rows)) return data.rows;
      if (Array.isArray(data.result)) return data.result;
    }
    return [];
  };
}
