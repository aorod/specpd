import { useState, useEffect, useCallback } from 'react';

/**
 * Busca todos os itens da API e retorna apenas os do tipo Timesheet.
 * Fetch próprio, independente do useUCData.
 */
export function useTimesheetData() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount((n) => n + 1), []);

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
      .then((all) => setData(all.filter((item) => item.workItemType === 'Timesheet')))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [retryCount]);

  return { data, loading, error, retry };
}
