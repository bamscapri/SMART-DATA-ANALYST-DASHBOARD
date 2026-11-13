import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { exportToCsv, exportToExcel } from '../../utils/exportUtils';
import {
  TableProperties,
  Search,
  ArrowUpDown,
  Download,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';

export const DataExplorer: React.FC = () => {
  const { selectedDataset, currentStats, activeSheet, setActiveSheet } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<string>('ALL');

  const rawData = selectedDataset?.data || [];
  const columns = useMemo(() => {
    if (rawData.length === 0) return [];
    return Object.keys(rawData[0]);
  }, [rawData]);

  // Filtering & Search
  const filteredData = useMemo(() => {
    let result = [...rawData];

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      if (selectedColumnFilter !== 'ALL') {
        result = result.filter(row =>
          String(row[selectedColumnFilter] ?? '').toLowerCase().includes(q)
        );
      } else {
        result = result.filter(row =>
          Object.values(row).some(val => String(val ?? '').toLowerCase().includes(q))
        );
      }
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [rawData, searchTerm, selectedColumnFilter, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <TableProperties className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Data Explorer & Tabular Inspection</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Eksplorasi baris data interaktif, pencarian multi-kolom, pengurutan cerdas, dan profiling kolom.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportToCsv(filteredData, `${selectedDataset?.name || 'dataset'}_filtered.csv`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-semibold border border-[var(--border-color)] transition-theme cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => exportToExcel(filteredData, 'Data', `${selectedDataset?.name || 'dataset'}.xlsx`)}
            style={{ backgroundColor: 'var(--color-success)' }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-90 text-[#FFFDF9] text-xs font-semibold transition-theme cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Dataset Profile Header Card */}
      <div className="p-4 rounded-xl surface-card flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg text-[var(--color-primary)]"
            style={{ backgroundColor: 'var(--bg-primary-soft)' }}
          >
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-[var(--text-main)]">{selectedDataset?.name}</div>
            <div className="text-[var(--text-secondary)] text-[11px] tabular-nums">
              {rawData.length} Total Baris · {columns.length} Kolom · Siap Dianalisis
            </div>
          </div>
        </div>

        {/* Sheet Selector if multiple sheets */}
        {selectedDataset?.sheets && selectedDataset.sheets.length > 1 && (
          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
            <Layers className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
            <span className="text-[var(--text-secondary)]">Pilih Sheet:</span>
            <select
              aria-label="Pilih Sheet Dataset"
              value={activeSheet}
              onChange={(e) => setActiveSheet(e.target.value)}
              className="bg-transparent text-[var(--color-primary)] font-bold focus:outline-none cursor-pointer"
            >
              {selectedDataset.sheets.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.data.length})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Column Profiling Bar */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-3 min-w-max">
          {currentStats.columns.map(col => (
            <div key={col.name} className="p-3.5 rounded-xl surface-card w-52 shrink-0 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[var(--text-main)] truncate">{col.name}</span>
                <span className="text-[10px] uppercase font-bold text-[var(--color-primary)] shrink-0">
                  {col.type}
                </span>
              </div>

              <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                Unique: {col.uniqueCount} · Missing: {col.missingCount}
              </div>

              {col.stats && (
                <div className="pt-1.5 border-t border-[var(--border-color)] text-[11px] space-y-0.5 font-mono tabular-nums text-[var(--text-secondary)]">
                  <div>Min: {col.stats.min.toLocaleString()}</div>
                  <div>Max: {col.stats.max.toLocaleString()}</div>
                  <div className="text-[var(--color-primary)] font-semibold">
                    Mean: {col.stats.mean.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search and Table Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label="Cari baris data"
              placeholder="Cari baris data apa saja..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-main)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-caramel)]"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-lg text-xs shrink-0">
            <Filter className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <select
              aria-label="Filter Berdasarkan Kolom"
              value={selectedColumnFilter}
              onChange={(e) => {
                setSelectedColumnFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-[var(--text-main)] focus:outline-none text-xs cursor-pointer"
            >
              <option value="ALL">Semua Kolom</option>
              {columns.map(col => (
                <option key={col} value={col}>
                  Kolom: {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] self-end tabular-nums">
          <span>Menampilkan {filteredData.length} baris</span>
          <select
            aria-label="Jumlah Baris per Halaman"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-[var(--text-main)]"
          >
            <option value={10}>10 per hal</option>
            <option value={15}>15 per hal</option>
            <option value={25}>25 per hal</option>
            <option value={50}>50 per hal</option>
          </select>
        </div>
      </div>

      {/* Main Tabular View */}
      <div className="overflow-x-auto rounded-xl surface-card">
        <table className="w-full text-left text-xs text-[var(--text-main)]">
          <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-[10px] font-bold sticky top-0 border-b border-[var(--border-color)]">
            <tr>
              <th className="px-3 py-3 w-12 text-center">#</th>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-4 py-3 cursor-pointer hover:text-[var(--color-primary)] select-none whitespace-nowrap transition-theme"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col}</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)] font-mono text-[11px] tabular-nums">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rIdx) => {
                const absoluteIndex = (currentPage - 1) * pageSize + rIdx + 1;
                return (
                  <tr key={rIdx} className="hover:bg-[var(--bg-caramel-soft)] transition-theme">
                    <td className="px-3 py-2.5 text-center text-[var(--text-secondary)] font-sans text-[10px]">
                      {absoluteIndex}
                    </td>
                    {columns.map((c, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5 whitespace-nowrap">
                        {row[c] !== null && row[c] !== undefined ? (
                          typeof row[c] === 'number' ? (
                            row[c].toLocaleString()
                          ) : (
                            String(row[c])
                          )
                        ) : (
                          <span className="italic" style={{ color: 'var(--color-warning)' }}>
                            null
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-[var(--text-secondary)] text-xs font-sans">
                  Tidak ditemukan data yang sesuai dengan pencarian "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1 tabular-nums">
        <div>
          Halaman {currentPage} dari {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Halaman Sebelumnya"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] disabled:opacity-40 hover:bg-[var(--bg-caramel-soft)] transition-theme cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Halaman Berikutnya"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] disabled:opacity-40 hover:bg-[var(--bg-caramel-soft)] transition-theme cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
