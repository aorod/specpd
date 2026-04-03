import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/localClient.js';

export function useFerias() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRegistros(await api.get('/ferias'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function incluir(data) {
    const novo = await api.post('/ferias', data);
    setRegistros((prev) => [novo, ...prev]);
  }

  async function editar(id, data) {
    const atualizado = await api.put(`/ferias/${id}`, data);
    setRegistros((prev) => prev.map((r) => (r.id === id ? atualizado : r)));
  }

  async function remover(id) {
    await api.delete(`/ferias/${id}`);
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  }

  return { registros, loading, error, incluir, editar, remover };
}
