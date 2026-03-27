import { useState, useEffect } from 'react';
import { fetchAnalytics } from '../api/analyticsClient.js';

export function useAnalytics(endpoint = '') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchAnalytics(endpoint, controller.signal)
      .then(setData)
      .catch(err => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [endpoint]);

  return { data, loading, error };
}
