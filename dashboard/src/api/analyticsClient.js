export async function fetchAnalytics(endpoint = '', signal) {
  const url = endpoint
    ? `/api/analytics?endpoint=${encodeURIComponent(endpoint)}`
    : '/api/analytics';

  const response = await fetch(url, { signal });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return response.json();
}
