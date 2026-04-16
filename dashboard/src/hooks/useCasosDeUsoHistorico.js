import { useCallback } from 'react';

/**
 * Fornece funções assíncronas para buscar o histórico de alterações
 * de Casos de Uso via API REST do Azure DevOps.
 *
 * Não gerencia loading/error — cada consumidor controla seu próprio estado.
 */
export function useCasosDeUsoHistorico() {
  /**
   * Busca o histórico de um único work item.
   * @param {number|string} numericId — apenas o número (sem prefixo "UC-")
   */
  const fetchItemHistory = useCallback(async (numericId) => {
    const res = await fetch(`/api/workitems/${numericId}/history`, { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, []);

  /**
   * Busca o histórico de múltiplos work items (máx 50).
   * @param {string[]} ids — array de IDs no formato "UC-123"
   */
  const fetchBatchHistory = useCallback(async (ids) => {
    const res = await fetch('/api/workitems/history/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, []);

  return { fetchItemHistory, fetchBatchHistory };
}
