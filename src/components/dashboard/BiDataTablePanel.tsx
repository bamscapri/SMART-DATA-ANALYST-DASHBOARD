import React, { useState, useMemo, useEffect } from 'react';
import { exportToCsv, exportToExcel } from '../../utils/exportUtils';
import {
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  Columns3,
  TableProperties,
  X,
} from 'lucide-react';

interface BiDataTablePanelProps {
  rows: Record<string, any>[];
  datasetName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  drillThroughLabel?: string | null;
  onClearDrillThrough?: () => void;
}

export const BiDataTablePanel: React.FC<BiDataTablePanelProps> = ({
  rows,
  datasetName,
  isExpanded,
  onToggleExpand,
  drillThroughLabel,
  onClearDrillThrough,
}) => {
  const allColumns = useMemo(() => Object.keys(rows[0] || {}), [rows]);
  const [visibleCols, setVisibleCols] = useState<string[]>([]);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setVisibleCols(allColumns.slice(0, 8));
    setPage(1);
  }, [allColumns.join(',')]);

  const activeCols = visibleCols.length > 0 ? visibleCols.filter(c => allColumns.includes(c)) : allColumns;

  const processedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? rows.filter(r => activeCols.some(c => String(r[c] ?? '').toLowerCase().includes(q)))
      : [...rows];

    if (sortCol && allColumns.includes(sortCol)) {
      list.sort((a, b) => {
        const va = a[sortCol];
        const vb = b[sortCol];
        const na = typeof va === 'number' ? va : Number(String(va).replace(/[$€£Rp,\s%]/gi, ''));
        const nb = typeof vb === 'number' ? vb : Number(String(vb).replace(/[$€£Rp,\s%]/gi, ''));
        if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
          return sortDir === 'asc' ? na - nb : nb - na;
        }
        return sortDir === 'asc'
          ? String(va ?? '').localeCompare(String(vb ?? ''))
          : String(vb ?? '').localeCompare(String(va ?? ''));
      });
    }
    return list;
  }, [rows, activeCols, allColumns, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = processedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const toggleCol = (col: string) => {
    setVisibleCols(prev => {
      if (prev.includes(col)) {
        return prev.length > 1 ? prev.filter(c => c !== col) : prev;
      }
      return [...prev, col];
    });
  };

  return (
    <section
      id="bi-data-records-panel"
      aria-label="Detail Data Records"
      className="rounded-xl surface-card overflow-hidden transition-theme"
    >
      {/* Collapsible Header Bar */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-secondary)]/55 border-b border-[var(--border-color)]">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          className="flex items-center gap-2 text-left cursor-pointer"
        >
          <TableProperties className="w-4 h-4 text-[var(--color-primary)]" />
          <div>
            <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
              <span>Detail Data Records &amp; Drill-Through Explorer</span>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] tabular-nums">
                ({processedRows.length.toLocaleString('id-ID')} baris)
              </span>
            </div>
            {drillThroughLabel && (
              <div className="text-[11px] text-[var(--color-primary)] font-semibold">
                Drill-Through aktif: {drillThroughLabel}
              </div>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-secondary)] ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] ml-1" />
          )}
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {drillThroughLabel && onClearDrillThrough && (
            <button
              type="button"
              onClick={onClearDrillThrough}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-danger-soft)] text-[var(--color-danger)] text-[11px] font-semibold cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset Drill-Through</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => exportToCsv(processedRows, `${datasetName.replace(/\s+/g, '_')}_filtered.csv`)}
            disabled={processedRows.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)] cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => exportToExcel(processedRows, 'Data_Records', `${datasetName.replace(/\s+/g, '_')}_filtered.xlsx`)}
            disabled={processedRows.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)] cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--color-success)]" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Expanded Table Controls + Data Grid */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari di dalam tabel records..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-main)]"
              />
            </div>

            {/* Column Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setColPickerOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)] cursor-pointer"
              >
                <Columns3 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>Columns ({activeCols.length}/{allColumns.length})</span>
              </button>

              {colPickerOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setColPickerOpen(false)} />
                  <div className="absolute right-0 mt-1 w-56 max-h-60 overflow-y-auto rounded-xl surface-card shadow-xl p-2 z-40 space-y-1 text-xs">
                    {allColumns.map(col => (
                      <label
                        key={col}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--bg-caramel-soft)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={activeCols.includes(col)}
                          onChange={() => toggleCol(col)}
                          className="accent-[var(--color-primary)]"
                        />
                        <span className="truncate text-[var(--text-main)]">{col}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                <tr>
                  {activeCols.map(col => (
                    <th key={col} className="px-3 py-2 font-semibold whitespace-nowrap border-b border-[var(--border-color)]">
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        className="flex items-center gap-1 hover:text-[var(--text-main)] cursor-pointer"
                      >
                        <span>{col}</span>
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {pagedRows.length > 0 ? (
                  pagedRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[var(--bg-caramel-soft)]/45 transition-colors">
                      {activeCols.map(col => {
                        const val = row[col];
                        const isNum = typeof val === 'number';
                        return (
                          <td
                            key={col}
                            className={`px-3 py-2 whitespace-nowrap text-[var(--text-main)] ${
                              isNum ? 'tabular-nums font-medium' : ''
                            }`}
                          >
                            {isNum ? val.toLocaleString('id-ID') : String(val ?? '-')}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Math.max(1, activeCols.length)} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                      Tidak ada baris data yang cocok dengan filter aktif.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] tabular-nums">
            <span>
              Halaman {safePage} dari {totalPages} · Menampilkan {pagedRows.length} dari {processedRows.length} records
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
