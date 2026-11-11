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
  Database,
  Info
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
          Object.values(row).some(val =>
            String(val ?? '').toLowerCase().includes(q)
          )
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
  }, [rawData, searchTerm, sortColumn, sortDirection]);

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
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TableProperties className="w-5 h-5 text-cyan-400" />
            Data Explorer & Tabular Inspection
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Eksplorasi baris data interaktif, pencarian multi-kolom, pengurutan cerdas, dan profiling kolom.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCsv(filteredData, `${selectedDataset?.name || 'dataset'}_filtered.csv`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Export CSV
          </button>
          <button
            onClick={() => exportToExcel(filteredData, 'Data', `${selectedDataset?.name || 'dataset'}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Dataset Profile Header Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-100">{selectedDataset?.name}</div>
            <div className="text-slate-400 text-[11px]">
              {rawData.length} Total Baris • {columns.length} Kolom • Status: Ready for Analysis
            </div>
          </div>
        </div>

        {/* Sheet Selector if multiple sheets */}
        {selectedDataset?.sheets && selectedDataset.sheets.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Pilih Sheet:</span>
            <select
              value={activeSheet}
              onChange={(e) => setActiveSheet(e.target.value)}
              className="bg-transparent text-cyan-300 font-bold focus:outline-none"
            >
              {selectedDataset.sheets.map(s => (
                <option key={s.name} value={s.name} className="bg-slate-900 text-slate-200">
                  {s.name} ({s.data.length})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Column Profiling Bar */}
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="flex items-center gap-3 min-w-max">
          {currentStats.columns.map(col => (
            <div
              key={col.name}
              className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 w-52 flex-shrink-0 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 truncate">{col.name}</span>
                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    col.type === 'numeric'
                      ? 'bg-blue-500/20 text-blue-300'
                      : col.type === 'date'
                      ? 'bg-amber-500/20 text-amber-300'
                      : col.type === 'categorical'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-slate-500/20 text-slate-300'
                  }`}
                >
                  {col.type}
                </span>
              </div>

              <div className="text-[10px] text-slate-400">
                Unique: {col.uniqueCount} • Missing: {col.missingCount}
              </div>

              {col.stats && (
                <div className="pt-1 border-t border-slate-800 text-[10px] space-y-0.5 font-mono text-slate-300">
                  <div>Min: {col.stats.min.toLocaleString()}</div>
                  <div>Max: {col.stats.max.toLocaleString()}</div>
                  <div className="text-cyan-400">Mean: {col.stats.mean.toLocaleString()}</div>
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari baris data apa saja..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedColumnFilter}
              onChange={(e) => {
                setSelectedColumnFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none text-xs"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Semua Kolom</option>
              {columns.map(col => (
                <option key={col} value={col} className="bg-slate-900 text-slate-200">
                  Kolom: {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 self-end">
          <span>Menampilkan {filteredData.length} baris hasil filter</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
          >
            <option value={10}>10 per hal</option>
            <option value={15}>15 per hal</option>
            <option value={25}>25 per hal</option>
            <option value={50}>50 per hal</option>
          </select>
        </div>
      </div>

      {/* Main Tabular View */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold sticky top-0 border-b border-slate-800">
            <tr>
              <th className="px-3 py-3 w-12 text-slate-400 text-center">#</th>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-4 py-3 cursor-pointer hover:text-cyan-400 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rIdx) => {
                const absoluteIndex = (currentPage - 1) * pageSize + rIdx + 1;
                return (
                  <tr key={rIdx} className="hover:bg-cyan-950/20 transition">
                    <td className="px-3 py-2.5 text-center text-slate-400 font-sans text-[10px]">
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
                          <span className="text-amber-500/70 italic">null</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-slate-400 text-xs">
                  Tidak ditemukan data yang sesuai dengan pencarian "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
        <div>
          Halaman {currentPage} dari {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
