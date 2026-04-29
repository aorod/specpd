import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { formatMesLabel } from '../../utils/formatters.js';
import { aliasName } from '../../utils/nameAliases.js';
import { useSort } from '../../hooks/useSort.js';
import './UCTable.css';

const PAGE_SIZES = [10, 25, 50, 100];
const MAX_PAGE_BTNS = 10;
const ADO_BASE = 'https://dev.azure.com/Vector-Brasil/Roadmap%202025/_workitems/edit/';

const SORTABLE_COLS = [
  { key: 'produto',    label: 'Produto'    },
  { key: 'assignedTo', label: 'PM&A'       },
  { key: 'embarcador', label: 'Embarcador' },
  { key: 'mes',        label: 'Mês'        },
  { key: 'ano',        label: 'Ano'        },
  { key: 'state',      label: 'Status'     },
  { key: 'subStatus',  label: 'Sub Status' },
];

const TOTAL_COLS = 2 + SORTABLE_COLS.length;

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <ChevronsUpDown size={13} className="sort-icon" />;
  return sortConfig.direction === 'asc'
    ? <ChevronUp size={13} className="sort-icon sort-icon--active" />
    : <ChevronDown size={13} className="sort-icon sort-icon--active" />;
}

function PageWindow({ safePage, totalPages, onPageChange }) {
  const half = Math.floor(MAX_PAGE_BTNS / 2);
  let winStart = Math.max(1, safePage - half);
  let winEnd = Math.min(totalPages, winStart + MAX_PAGE_BTNS - 1);
  if (winEnd - winStart + 1 < MAX_PAGE_BTNS) {
    winStart = Math.max(1, winEnd - MAX_PAGE_BTNS + 1);
  }
  return Array.from({ length: winEnd - winStart + 1 }, (_, i) => winStart + i).map((p) => (
    <button
      key={p}
      className={`pagination-btn pagination-page-btn${p === safePage ? ' pagination-page-btn--active' : ''}`}
      onClick={() => onPageChange(p)}
      aria-current={p === safePage ? 'page' : undefined}
    >
      {p}
    </button>
  ));
}

export default function EmbarcadorTable({ data }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { sortedData, sortConfig, requestSort } = useSort(data);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = sortedData.slice(start, start + pageSize);

  const handleSort = (key) => { requestSort(key); setPage(1); };
  const handlePageSize = (e) => { setPageSize(Number(e.target.value)); setPage(1); };

  const from = sortedData.length === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, sortedData.length);

  return (
    <div className="uc-table-wrap">
      <div className="uc-table-header">
        <h3 className="uc-table-title">Lista de Casos de Uso — Embarcadores</h3>
        <span className="uc-table-count">{sortedData.length} item{sortedData.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="uc-table-scroll">
        <table className="uc-table" role="table">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Título</th>
              {SORTABLE_COLS.map(({ key, label }) => (
                <th
                  key={key}
                  scope="col"
                  className="sortable-th"
                  aria-sort={sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
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
                <td colSpan={TOTAL_COLS} className="uc-table-empty">
                  Nenhum Caso de Uso encontrado com os filtros aplicados.
                </td>
              </tr>
            ) : (
              pageItems.map((item, idx) => {
                const idNum = item.id.replace(/\D/g, '');
                return (
                  <tr key={item.id} className="uc-table-row" style={{ animationDelay: `${idx * 12}ms` }}>
                    <td className="cell-id">
                      <a href={`${ADO_BASE}${idNum}`} target="_blank" rel="noreferrer" className="cell-id-link">
                        {item.id}
                      </a>
                    </td>
                    <td className="cell-title">
                      <span title={item.title} className="title-text">{item.title}</span>
                    </td>
                    <td>{item.produto}</td>
                    <td>{aliasName(item.assignedTo)}</td>
                    <td>
                      {item.embarcador ? (
                        <span className="embarcador-badge">{item.embarcador}</span>
                      ) : (
                        <span className="embarcador-empty">—</span>
                      )}
                    </td>
                    <td>{formatMesLabel(item.mes)}</td>
                    <td>{item.ano}</td>
                    <td>
                      <span className={`state-badge state-badge--${item.state.toLowerCase().replace(/\s+/g, '-')}`}>
                        {item.state}
                      </span>
                    </td>
                    <td>{item.subStatus}</td>
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

        <div className="pagination-center">
          <button
            className="pagination-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={15} />
          </button>

          <PageWindow safePage={safePage} totalPages={totalPages} onPageChange={setPage} />

          <button
            className="pagination-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="pagination-right">
          <span className="page-size-label">Por página</span>
          <select className="page-size-select" value={pageSize} onChange={handlePageSize} aria-label="Itens por página">
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
