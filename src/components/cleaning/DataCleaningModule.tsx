import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { cleanDataset, CleaningRule, CleaningReport } from '../../utils/dataCleaner';
import { detectOutliers } from '../../utils/analytics';
import {
  Wand2,
  CheckCircle2,
  RotateCcw,
  Save,
  Sliders
} from 'lucide-react';

export const DataCleaningModule: React.FC = () => {
  const { selectedDataset, currentStats, saveCleanedDataset, logActivity } = useApp();

  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [trimStrings, setTrimStrings] = useState(true);
  const [selectedColumn, setSelectedColumn] = useState<string>(() => {
    return currentStats.columns[0]?.name || '';
  });
  const [missingAction, setMissingAction] = useState<'keep' | 'drop_row' | 'fill_mean' | 'fill_median' | 'fill_custom'>('fill_mean');
  const [outlierAction, setOutlierAction] = useState<'keep' | 'drop_row' | 'cap_bounds'>('cap_bounds');
  const [customValue, setCustomValue] = useState<string>('0');
  const [cleaningRules, setCleaningRules] = useState<CleaningRule[]>([]);
  const [appliedReport, setAppliedReport] = useState<CleaningReport | null>(null);
  const [cleanedRows, setCleanedRows] = useState<Record<string, any>[] | null>(null);

  const currentAnomalies = useMemo(() => {
    const raw = selectedDataset?.data || [];
    const targetMeta = currentStats.columns.find(c => c.name === selectedColumn);
    const missing = targetMeta?.missingCount || 0;

    let outliersCount = 0;
    if (targetMeta?.type === 'numeric') {
      const numbers = raw.map(r => r[selectedColumn]).filter(v => typeof v === 'number');
      outliersCount = detectOutliers(numbers).length;
    }

    return {
      missing,
      outliersCount,
      type: targetMeta?.type || 'text'
    };
  }, [selectedDataset, selectedColumn, currentStats]);

  const handleAddRule = () => {
    const newRule: CleaningRule = {
      column: selectedColumn,
      missingAction: missingAction !== 'keep' ? missingAction : undefined,
      outlierAction: outlierAction !== 'keep' ? outlierAction : undefined,
      customFillValue: missingAction === 'fill_custom' ? customValue : undefined,
      trimWhitespace: trimStrings
    };

    const updatedRules = [...cleaningRules.filter(r => r.column !== selectedColumn), newRule];
    setCleaningRules(updatedRules);

    const { cleanedData, report } = cleanDataset(selectedDataset?.data || [], updatedRules, removeDuplicates);
    setCleanedRows(cleanedData);
    setAppliedReport(report);
  };

  const handleCommit = () => {
    if (!cleanedRows) return;
    saveCleanedDataset(cleanedRows, selectedDataset?.name || 'Dataset');
    logActivity(
      'DATA_CLEANING',
      'Dataset',
      selectedDataset?.name || 'Dataset',
      `Applied ${appliedReport?.appliedRules.length || 0} transforms`
    );
  };

  const handleReset = () => {
    setCleaningRules([]);
    setAppliedReport(null);
    setCleanedRows(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-[var(--color-primary)]" />
          <span>Modul Data Cleaning & Normalisasi</span>
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Deteksi nilai kosong (missing values), deduplikasi baris, normalisasi format, dan penanganan outliers IQR dengan persetujuan pengguna sebelum disimpan.
        </p>
      </div>

      {/* Dataset Health Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl surface-card">
          <span className="text-[var(--text-secondary)] text-xs block">Total Baris Asli</span>
          <div className="text-xl font-bold text-[var(--text-main)] mt-1 tabular-nums">
            {selectedDataset?.data?.length || 0} Baris
          </div>
        </div>

        <div className="p-4 rounded-xl surface-card">
          <span className="text-[var(--text-secondary)] text-xs block">Duplikasi Terdeteksi</span>
          <div className="text-xl font-bold mt-1 tabular-nums" style={{ color: 'var(--color-warning)' }}>
            {currentStats.duplicateRows} Baris
          </div>
        </div>

        <div className="p-4 rounded-xl surface-card">
          <span className="text-[var(--text-secondary)] text-xs block">Total Missing Cells</span>
          <div className="text-xl font-bold mt-1 tabular-nums" style={{ color: 'var(--color-danger)' }}>
            {currentStats.missingCells} Sel
          </div>
        </div>

        <div className="p-4 rounded-xl surface-card">
          <span className="text-[var(--text-secondary)] text-xs block">Status Integritas</span>
          <div className="text-xl font-bold mt-1" style={{ color: 'var(--color-success)' }}>
            {currentStats.missingCells === 0 && currentStats.duplicateRows === 0 ? 'Optimal (100%)' : 'Needs Cleaning'}
          </div>
        </div>
      </div>

      {/* Cleaning Configurator Card */}
      <div className="p-6 rounded-2xl surface-card space-y-5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
          <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Konfigurasi Transformasi & Pembersihan</span>
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-[var(--text-main)] cursor-pointer">
              <input
                type="checkbox"
                checked={removeDuplicates}
                onChange={(e) => setRemoveDuplicates(e.target.checked)}
                className="rounded border-[var(--border-color)] accent-[var(--color-primary)]"
              />
              <span>Hapus Duplikasi Otomatis</span>
            </label>
            <label className="flex items-center gap-2 text-[var(--text-main)] cursor-pointer">
              <input
                type="checkbox"
                checked={trimStrings}
                onChange={(e) => setTrimStrings(e.target.checked)}
                className="rounded border-[var(--border-color)] accent-[var(--color-primary)]"
              />
              <span>Trim Whitespace</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="dc-col" className="text-[var(--text-main)] font-semibold block mb-1">
              Pilih Kolom yang Dikonfigurasi
            </label>
            <select
              id="dc-col"
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              {currentStats.columns.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type}) {c.missingCount > 0 ? `· ${c.missingCount} missing` : ''}
                </option>
              ))}
            </select>
            <div className="mt-1.5 text-[11px] text-[var(--text-secondary)] tabular-nums">
              Missing: <strong style={{ color: 'var(--color-danger)' }}>{currentAnomalies.missing}</strong> · Outliers:{' '}
              <strong style={{ color: 'var(--color-warning)' }}>{currentAnomalies.outliersCount}</strong>
            </div>
          </div>

          <div>
            <label htmlFor="dc-missing" className="text-[var(--text-main)] font-semibold block mb-1">
              Penanganan Missing Value (Null/Empty)
            </label>
            <select
              id="dc-missing"
              value={missingAction}
              onChange={(e) => setMissingAction(e.target.value as any)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              <option value="keep">Biarkan (Tidak Diubah)</option>
              <option value="drop_row">Drop Baris yang Memiliki Nilai Kosong</option>
              {currentAnomalies.type === 'numeric' && (
                <>
                  <option value="fill_mean">Imputasi dengan Nilai Mean (Rata-rata)</option>
                  <option value="fill_median">Imputasi dengan Nilai Median</option>
                </>
              )}
              <option value="fill_custom">Isi dengan Nilai Kustom</option>
            </select>
            {missingAction === 'fill_custom' && (
              <input
                type="text"
                placeholder="Nilai kustom"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="mt-2 w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded px-2.5 py-1.5 text-[var(--text-main)]"
              />
            )}
          </div>

          <div>
            <label htmlFor="dc-outlier" className="text-[var(--text-main)] font-semibold block mb-1">
              Penanganan Outlier (Nilai Ekstrem)
            </label>
            <select
              id="dc-outlier"
              value={outlierAction}
              onChange={(e) => setOutlierAction(e.target.value as any)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              <option value="keep">Pertahankan Outlier</option>
              <option value="cap_bounds">Cap Outlier ke Batas 1.5x IQR (Normalisasi Batas)</option>
              <option value="drop_row">Drop Baris yang Mengandung Outlier Ekstrem</option>
            </select>
            <div className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
              IQR Rule: Q1 - 1.5*IQR sampai Q3 + 1.5*IQR
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
          <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
            {cleaningRules.length} Aturan aktif diterapkan
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] border border-[var(--border-color)] transition-theme cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Aturan</span>
            </button>
            <button
              type="button"
              onClick={handleAddRule}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold transition-theme cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Jalankan Preview Pembersihan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cleaning Report & Comparison Preview */}
      {appliedReport && cleanedRows && (
        <div className="p-6 rounded-2xl surface-card border-[var(--accent-caramel)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
            <div>
              <div className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                <span>Audit Trail Pembersihan Data (Preview Siap Disimpan)</span>
              </div>
              <div className="text-xs text-[var(--text-main)] mt-1 tabular-nums">
                Baris Awal: {appliedReport.originalRowCount} ➔ Baris Hasil: {appliedReport.newRowCount} (Duplikasi terhapus: {appliedReport.duplicatesRemoved}, Missing tertangani: {appliedReport.missingValuesHandled}, Outliers disesuaikan: {appliedReport.outliersAdjusted})
              </div>
            </div>

            <button
              type="button"
              onClick={handleCommit}
              style={{ backgroundColor: 'var(--color-success)' }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg hover:opacity-90 text-[#FFFDF9] font-semibold text-xs shadow-xs transition-theme active:scale-95 self-start sm:self-auto cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Setujui & Simpan Sebagai Dataset Baru</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl surface-secondary space-y-1.5">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
              Ringkasan Operasi Transformasi
            </span>
            <ul className="space-y-1 text-xs text-[var(--text-main)] list-disc list-inside">
              {appliedReport.appliedRules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
