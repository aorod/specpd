import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { classifyFluxo, FLUXO_NORMAL } from '../../utils/classifyFluxo.js';
import { useSort } from '../../hooks/useSort.js';
import './UCTable.css';

const PAGE_SIZE = 10;

const SORTABLE_COLS = [
  { key: 'mes',           label: 'Mês' },
  { key: 'produto',       label: 'Produto' },
  { key: 'designer',      label: 'Designer' },
  { key: 'state',         label: 'State' },
  { key: 'classificacao', label: 'Classificação' },
];

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <ChevronsUpDown size={13} className="sort-icon" />;
  return sortConfig.direction === 'asc'
    ? <ChevronUp size={13} className="sort-icon sort-icon--active" />
    : <ChevronDown size={13} className="sort-icon sort-icon--active" />;
}

export default function UCTable({ data }) {
  const [page, setPage] = useState(1);
  const { sortedData, sortConfig, requestSort } = useSort(data);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const safePageage = Math.min(page, totalPages);
  const start = (safePageage - 1) * PAGE_SIZE;
  const pageItems = sortedData.slice(start, start + PAGE_SIZE);

  const handleSort = (key) => {
    requestSort(key);
    setPage(1);
  };

  const from = sortedData.length === 0 ? 0 : start + 1;
  const to = Math.min(start + PAGE_SIZE, sortedData.length);

  return (
    <div className="uc-table-wrap">
      <div className="uc-table-header">
        <h3 className="uc-table-title">Lista de UCs</h3>
        <span className="uc-table-count">{sortedData.length} item{sortedData.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="uc-table-scroll">
        <table className="uc-table" role="table">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Título</th>
              <th scope="col">Tipo</th>
              {SORTABLE_COLS.map(({ key, label }) => (
                <th
                  key={key}
                  scope="col"
                  className="sortable-th"
                  aria-sort={
                    sortConfig.key === key
                      ? sortConfig.direction === 'asc' ? 'ascending' : 'descending'
                      : 'none'
                  }
                  onClick={() => handleSort(key)}
                >
                  <span className="th-inner">
                    {label}
                    <SortIcon col={key} sortConfig={sortConfig} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="uc-table-empty">
                  Nenhuma UC encontrada com os filtros aplicados.
                </td>
              </tr>
            ) : (
              pageItems.map((item, idx) => {
                const fluxo = classifyFluxo(item);
                const isNormal = fluxo === FLUXO_NORMAL;
                return (
                  <tr
                    key={item.id}
                    className="uc-table-row"
                    style={{ animationDelay: `${idx * 12}ms` }}
                  >
                    <td className="cell-id">{item.id}</td>
                    <td className="cell-title">
                      <span title={item.title} className="title-text">
                        {item.title}
                      </span>
                    </td>
                    <td className="cell-type">{item.workItemType}</td>
                    <td>{item.produto}</td>
                    <td>{item.designer}</td>
                    <td>{item.mes}</td>
                    <td>
                      <span className={`state-badge state-badge--${item.state.toLowerCase().replace(/\s+/g, '-')}`}>
                        {item.state}
                      </span>
                    </td>
                    <td>
                      <span className={`fluxo-badge fluxo-badge--${isNormal ? 'normal' : 'er'}`}>
                        {isNormal ? 'Fluxo Normal' : 'Eng. Reversa'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="uc-pagination">
        <span className="pagination-info">
          {sortedData.length > 0 ? `${from}–${to} de ${sortedData.length} itens` : '0 itens'}
        </span>
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePageage === 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pagination-pages">
            {safePageage} / {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePageage === totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
