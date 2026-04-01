import { useMemo } from 'react';
import { useUCData } from './useUCData.js';

/**
 * Retorna apenas os itens com workItemType === 'Timesheet'.
 * Reutiliza o mesmo fetch de useUCData para não duplicar requisições.
 */
export function useTimesheetData() {
  const { data, loading, error, retry } = useUCData();

  const timesheetData = useMemo(
    () => data.filter((item) => item.workItemType === 'Timesheet'),
    [data]
  );

  return { data: timesheetData, loading, error, retry };
}
