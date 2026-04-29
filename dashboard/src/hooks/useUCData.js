import { useState, useEffect, useCallback } from 'react';

/**
 * Busca os dados reais de Casos de Uso do backend proxy.
 * O servidor faz o de/para dos campos do Azure DevOps Analytics.
 * retry: força POST /api/sync antes de buscar dados frescos.
 */
export function useUCData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch('/api/sync', { method: 'POST' });
    } catch {
      // se o sync falhar, ainda tenta buscar o cache
    }
    setRetryCount((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch('/api/analytics', {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) return res.json().then((b) => Promise.reject(new Error(b.error ?? `HTTP ${res.status}`)));
        return res.json();
      })
      .then((all) => setData(all.filter((item) => item.workItemType === 'Caso de Uso' && item.projeto === 'Roadmap 2026')))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [retryCount]);

  return { data, loading, error, retry };
}
