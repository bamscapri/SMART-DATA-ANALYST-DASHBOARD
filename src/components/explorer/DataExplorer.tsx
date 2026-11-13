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
  ShieldCheck,
  GitBranch,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export const DataExplorer: React.FC = () => {
  const { selectedDataset, intelligenceReport, activeSheet, setActiveSheet } = useApp();
  const [subTab, setSubTab] = useState<'tabular' | 'profiling' | 'lineage' | 'document'>('tabular');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<string>('ALL');

  const rawData = selectedDataset?.data || [];
  const profile = intelligenceReport.profile;
  const docContent = selectedDataset?.documentContent;

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

  const qualityColor =
    profile.quality.overallScore >= 90
      ? 'var(--color-success)'
      : profile.quality.overallScore >= 75
      ? 'var(--color-warning)'
      : 'var(--color-danger)';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <TableProperties className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Data Explorer, Profiling & Lineage</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Inspeksi tabular, Data Quality Score, profiling semantik 8-tipe (CV%, Skewness, IQR, Mode), serta pelacakan Data Lineage & struktur dokumen.
          </p>
        </div>

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

      {/* Dataset Profile & Quality Header Card */}
      <div className="p-4 rounded-xl surface-card flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg text-[var(--color-primary)]"
            style={{ backgroundColor: 'var(--bg-primary-soft)' }}
          >
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-[var(--text-main)] flex items-center gap-2 flex-wrap">
              <span>{selectedDataset?.name}</span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold"
                style={{ backgroundColor: 'var(--bg-caramel-soft)', color: 'var(--color-primary)' }}
              >
                {selectedDataset?.analysisMode === 'document' ? 'DOCUMENT MODE' : 'STRUCTURED MODE'}
              </span>
            </div>
            <div className="text-[var(--text-secondary)] text-[11px] tabular-nums mt-0.5">
              {rawData.length} Baris · {columns.length} Kolom · Missing: {profile.missingCells} ({profile.missingPct}%) · Duplikat: {profile.duplicateRows}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg surface-secondary border border-[var(--border-color)]">
            <ShieldCheck className="w-4 h-4" style={{ color: qualityColor }} />
            <span className="text-[var(--text-secondary)]">Data Quality:</span>
            <span className="font-bold font-mono tabular-nums" style={{ color: qualityColor }}>
              {profile.quality.overallScore}/100 ({profile.quality.grade})
            </span>
          </div>

          {selectedDataset?.sheets && selectedDataset.sheets.length > 1 && (
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
              <Layers className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
              <span className="text-[var(--text-secondary)]">Sheet:</span>
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
      </div>

      {/* Sub-view Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'tabular' as const, label: 'Data Tabular & Kolom Ringkas', icon: TableProperties },
          { key: 'profiling' as const, label: 'Detailed Profiling & Quality Score', icon: ShieldCheck },
          { key: 'lineage' as const, label: `Data Lineage (${selectedDataset?.lineage?.length || 1})`, icon: GitBranch },
          ...(docContent
            ? [{ key: 'document' as const, label: `Document Intelligence (${docContent.tableCount} Tabel)`, icon: FileText }]
            : []),
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSubTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-theme cursor-pointer ${
                subTab === tab.key
                  ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-2xs'
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TABULAR VIEW */}
      {subTab === 'tabular' && (
        <>
          {/* Quick Column Profiling Strip */}
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center gap-3 min-w-max">
              {profile.columns.map(col => (
                <div key={col.name} className="p-3.5 rounded-xl surface-card w-56 shrink-0 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[var(--text-main)] truncate">{col.name}</span>
                    <span className="text-[10px] uppercase font-bold text-[var(--color-primary)] shrink-0">
                      {col.semanticType}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                    Unique: {col.uniqueCount} · Null: {col.missingCount} ({col.nullPct}%)
                  </div>
                  {col.numericStats && (
                    <div className="pt-1.5 border-t border-[var(--border-color)] text-[11px] space-y-0.5 font-mono tabular-nums text-[var(--text-secondary)]">
                      <div>Min–Max: {col.numericStats.min.toLocaleString()} – {col.numericStats.max.toLocaleString()}</div>
                      <div className="text-[var(--color-primary)] font-semibold">
                        Mean: {col.numericStats.mean.toLocaleString()} · CV: {col.numericStats.cvPct}%
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
        </>
      )}

      {/* TAB 2: DETAILED DATA PROFILING */}
      {subTab === 'profiling' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl surface-card">
              <span className="text-[var(--text-secondary)]">Completeness</span>
              <div className="text-xl font-bold text-[var(--text-main)] mt-1 tabular-nums">
                {profile.quality.completenessScore}%
              </div>
            </div>
            <div className="p-4 rounded-xl surface-card">
              <span className="text-[var(--text-secondary)]">Uniqueness</span>
              <div className="text-xl font-bold text-[var(--text-main)] mt-1 tabular-nums">
                {profile.quality.uniquenessScore}%
              </div>
            </div>
            <div className="p-4 rounded-xl surface-card">
              <span className="text-[var(--text-secondary)]">Type Consistency</span>
              <div className="text-xl font-bold text-[var(--text-main)] mt-1 tabular-nums">
                {profile.quality.consistencyScore}%
              </div>
            </div>
            <div className="p-4 rounded-xl surface-card">
              <span className="text-[var(--text-secondary)]">Validity (Outlier Check)</span>
              <div className="text-xl font-bold text-[var(--text-main)] mt-1 tabular-nums">
                {profile.quality.validityScore}%
              </div>
            </div>
          </div>

          {profile.warnings.length > 0 && (
            <div className="p-4 rounded-xl surface-card border border-[var(--color-warning)] space-y-1.5 text-xs">
              <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--color-warning)' }}>
                <AlertTriangle className="w-4 h-4" />
                <span>Peringatan Kualitas & Kelayakan Analisis</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-[var(--text-main)] space-y-0.5">
                {profile.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl surface-card">
            <table className="w-full text-left text-xs text-[var(--text-main)]">
              <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-[10px] font-bold border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-4 py-3">Kolom</th>
                  <th className="px-4 py-3">Tipe Semantik</th>
                  <th className="px-4 py-3">Null (%)</th>
                  <th className="px-4 py-3">Unique (%)</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Mean / Median</th>
                  <th className="px-4 py-3">StdDev / CV%</th>
                  <th className="px-4 py-3">IQR / Skew</th>
                  <th className="px-4 py-3">Catatan Kualitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-[11px] tabular-nums">
                {profile.columns.map(c => (
                  <tr key={c.name} className="hover:bg-[var(--bg-caramel-soft)]">
                    <td className="px-4 py-2.5 font-bold">{c.name}</td>
                    <td className="px-4 py-2.5 font-mono text-[var(--color-primary)] font-semibold">
                      {c.semanticType}
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      {c.missingCount} ({c.nullPct}%)
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      {c.uniqueCount} ({c.uniquePct}%)
                    </td>
                    <td className="px-4 py-2.5 font-mono truncate max-w-[120px]">{String(c.mode ?? '-')}</td>
                    <td className="px-4 py-2.5 font-mono">
                      {c.numericStats
                        ? `${c.numericStats.mean.toLocaleString('id-ID')} / ${c.numericStats.median.toLocaleString('id-ID')}`
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      {c.numericStats
                        ? `${c.numericStats.stdDev.toLocaleString('id-ID')} (${c.numericStats.cvPct}%)`
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      {c.numericStats
                        ? `${c.numericStats.iqr.toLocaleString('id-ID')} / ${c.numericStats.skewness}`
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.qualityIssues.length > 0 ? (
                        <span style={{ color: 'var(--color-warning)' }}>{c.qualityIssues[0]}</span>
                      ) : (
                        <span style={{ color: 'var(--color-success)' }}>Clean</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DATA LINEAGE & AUDIT TRAIL */}
      {subTab === 'lineage' && (
        <div className="p-6 rounded-2xl surface-card space-y-4 text-xs">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Data Lineage & Provenance History</span>
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Jejak asal sumber data, proses ekstraksi, pembersihan, transformasi ETL, hingga analisis statistik.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl surface-secondary">
              <span className="text-[10px] uppercase text-[var(--text-secondary)]">Source Origin</span>
              <div className="font-bold text-[var(--text-main)] mt-0.5">
                {selectedDataset?.sourceMeta?.sourceType?.toUpperCase() || 'SEED / LOCAL'}
              </div>
              {selectedDataset?.sourceMeta?.sourceUrl && (
                <div className="text-[10px] font-mono text-[var(--color-primary)] truncate mt-0.5">
                  {selectedDataset.sourceMeta.sourceUrl}
                </div>
              )}
            </div>
            <div className="p-3 rounded-xl surface-secondary">
              <span className="text-[10px] uppercase text-[var(--text-secondary)]">File Asal</span>
              <div className="font-bold text-[var(--text-main)] mt-0.5 truncate">{selectedDataset?.fileName}</div>
            </div>
            <div className="p-3 rounded-xl surface-secondary">
              <span className="text-[10px] uppercase text-[var(--text-secondary)]">Riwayat Transformasi</span>
              <div className="font-bold text-[var(--color-primary)] mt-0.5">
                {selectedDataset?.lineage?.length || 1} Tahap Tercatat
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            {(selectedDataset?.lineage && selectedDataset.lineage.length > 0
              ? selectedDataset.lineage
              : [
                  {
                    id: 'seed-0',
                    timestamp: selectedDataset?.uploadedAt || new Date().toISOString(),
                    stage: 'INGESTION',
                    action: 'DATASET_LOADED',
                    details: `Dataset dimuat (${rawData.length} baris × ${columns.length} kolom)`,
                    userName: 'System',
                  },
                ]
            ).map((step, idx) => (
              <div
                key={step.id}
                className="p-3.5 rounded-xl surface-secondary border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary)] text-[var(--text-on-primary)]">
                      #{idx + 1} · {step.stage}
                    </span>
                    <span className="font-bold text-[var(--text-main)]">{step.action}</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{step.details}</div>
                </div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)] sm:text-right shrink-0">
                  <div>{new Date(step.timestamp).toLocaleString('id-ID')}</div>
                  {step.userName && <div>Oleh: {step.userName}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENT INTELLIGENCE VIEW */}
      {subTab === 'document' && docContent && (
        <div className="p-6 rounded-2xl surface-card space-y-5 text-xs">
          <div className="border-b border-[var(--border-color)] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Document Intelligence & Extracted Content</span>
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Halaman: {docContent.pageCount} · Kata: {docContent.wordCount.toLocaleString('id-ID')} · Headings: {docContent.headingCount} · Tabel: {docContent.tableCount}
              </p>
            </div>
          </div>

          {docContent.headings.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase text-[var(--text-secondary)]">Struktur Tajuk / Headings</div>
              <div className="flex flex-wrap gap-1.5">
                {docContent.headings.slice(0, 15).map((h, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg surface-secondary border border-[var(--border-color)] font-medium">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {docContent.sections.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase text-[var(--text-secondary)]">Kutipan Bagian Dokumen</div>
              {docContent.sections.slice(0, 8).map((sec, idx) => (
                <div key={idx} className="p-3.5 rounded-xl surface-secondary border border-[var(--border-color)] space-y-1">
                  <div className="font-bold text-[var(--color-primary)] flex items-center justify-between">
                    <span>{sec.heading}</span>
                    {sec.pageNumber && <span className="text-[10px] font-mono">Hal. {sec.pageNumber}</span>}
                  </div>
                  <p className="text-[11px] text-[var(--text-main)] whitespace-pre-wrap leading-relaxed">
                    {sec.content.slice(0, 500)}
                    {sec.content.length > 500 ? '...' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
