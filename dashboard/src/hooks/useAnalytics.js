import { useState, useEffect } from 'react';
import { fetchAnalytics } from '../api/analyticsClient.js';

export function useAnalytics(endpoint = '') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics(endpoint)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [endpoint]);

  return { data, loading, error };
}
