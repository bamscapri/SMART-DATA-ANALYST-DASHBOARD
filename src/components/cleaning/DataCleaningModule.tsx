import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { cleanDataset, CleaningRule, CleaningReport } from '../../utils/dataCleaner';
import { detectOutliers } from '../../utils/analytics';
import {
  Wand2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Trash2,
  Layers,
  ArrowRight,
  Database,
  Sliders,
  Check
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

  // Compute detected anomalies & missing cells in real time
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

    // Run preview clean
    const { cleanedData, report } = cleanDataset(selectedDataset?.data || [], updatedRules, removeDuplicates);
    setCleanedRows(cleanedData);
    setAppliedReport(report);
  };

  const handleCommit = () => {
    if (!cleanedRows) return;
    saveCleanedDataset(cleanedRows, selectedDataset?.name || 'Dataset');
    logActivity('DATA_CLEANING', 'Dataset', selectedDataset?.name || 'Dataset', `Applied ${appliedReport?.appliedRules.length || 0} transforms`);
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
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-cyan-400" />
          Modul Data Cleaning & Normalisasi
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Deteksi nilai kosong (missing values), deduplikasi baris, normalisasi format, dan penanganan outliers IQR dengan persetujuan pengguna sebelum disimpan.
        </p>
      </div>

      {/* Dataset Health Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs block">Total Baris Asli:</span>
          <div className="text-xl font-bold text-white mt-1">
            {selectedDataset?.data?.length || 0} Baris
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs block">Duplikasi Terdeteksi:</span>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {currentStats.duplicateRows} Baris
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs block">Total Missing Cells:</span>
          <div className="text-xl font-bold text-rose-400 mt-1">
            {currentStats.missingCells} Sel
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs block">Status Integritas:</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {currentStats.missingCells === 0 && currentStats.duplicateRows === 0 ? 'Optimal (100%)' : 'Needs Cleaning'}
          </div>
        </div>
      </div>

      {/* Cleaning Configurator Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Konfigurasi Transformasi & Pembersihan
          </h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={removeDuplicates}
                onChange={(e) => setRemoveDuplicates(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
              />
              <span>Hapus Duplikasi Otomatis</span>
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={trimStrings}
                onChange={(e) => setTrimStrings(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
              />
              <span>Trim Whitespace</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Pilih Kolom yang Dikonfigurasi:</label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {currentStats.columns.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type}) {c.missingCount > 0 ? `• ${c.missingCount} missing` : ''}
                </option>
              ))}
            </select>
            <div className="mt-1.5 text-[10px] text-slate-400">
              Missing pada kolom: <span className="text-rose-400 font-bold">{currentAnomalies.missing}</span> • Outliers:{' '}
              <span className="text-amber-400 font-bold">{currentAnomalies.outliersCount}</span>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Penanganan Missing Value (Null/Empty):</label>
            <select
              value={missingAction}
              onChange={(e) => setMissingAction(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
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
                className="mt-2 w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100"
              />
            )}
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Penanganan Outlier (Nilai Ekstrem):</label>
            <select
              value={outlierAction}
              onChange={(e) => setOutlierAction(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="keep">Pertahankan Outlier</option>
              <option value="cap_bounds">Cap Outlier ke Batas 1.5x IQR (Normalisasi Batas)</option>
              <option value="drop_row">Drop Baris yang Mengandung Outlier Ekstrem</option>
            </select>
            <div className="mt-1.5 text-[10px] text-slate-400">
              IQR Rule: Q1 - 1.5*IQR sampai Q3 + 1.5*IQR
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-400">
            {cleaningRules.length} Aturan aktif diterapkan
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Aturan</span>
            </button>
            <button
              onClick={handleAddRule}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Jalankan Preview Pembersihan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cleaning Report & Comparison Preview */}
      {appliedReport && cleanedRows && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-cyan-500/40 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Audit Trail Pembersihan Data (Preview Siap Disimpan)
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Baris Awal: {appliedReport.originalRowCount} ➔ Baris Hasil: {appliedReport.newRowCount} (Duplikasi terhapus: {appliedReport.duplicatesRemoved}, Missing tertangani: {appliedReport.missingValuesHandled}, Outliers disesuaikan: {appliedReport.outliersAdjusted})
              </div>
            </div>

            <button
              onClick={handleCommit}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              <span>Setujui & Simpan Sebagai Dataset Baru</span>
            </button>
          </div>

          {/* List of applied transforms */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Ringkasan Operasi Transformasi:
            </span>
            <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
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
