import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/localClient.js';

export function useCalendarEvents(ano) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = ano ? `?ano=${ano}` : '';
      setEvents(await api.get(`/calendar/events${query}`));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ano]);

  useEffect(() => { carregar(); }, [carregar]);

  async function criar(data) {
    const novo = await api.post('/calendar/events', data);
    setEvents((prev) => [...prev, novo].sort((a, b) => a.data.localeCompare(b.data)));
  }

  async function editar(id, data) {
    const atualizado = await api.put(`/calendar/events/${id}`, data);
    setEvents((prev) => prev.map((e) => (e.id === id ? atualizado : e)));
  }

  async function remover(id) {
    await api.delete(`/calendar/events/${id}`);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return { events, loading, error, criar, editar, remover };
}
