import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  cleanDataset,
  CleaningRule,
  CleaningReport,
  MissingAction,
  OutlierMethod,
  TextNormalizeMode,
} from '../../utils/dataCleaner';
import { applyEtlTransform, mergeDatasetsByKey, EtlOperation, EtlAggregationFn } from '../../utils/etlEngine';
import { detectOutliers } from '../../utils/analytics';
import {
  Wand2,
  CheckCircle2,
  RotateCcw,
  Save,
  Sliders,
  Workflow,
  GitMerge,
  AlertCircle,
} from 'lucide-react';

export const DataCleaningModule: React.FC = () => {
  const {
    datasets,
    selectedDataset,
    currentStats,
    saveCleanedDataset,
    saveTransformedDataset,
    logActivity,
    addToast,
  } = useApp();

  const [moduleTab, setModuleTab] = useState<'cleaning' | 'etl' | 'merge'>('cleaning');

  // --- DATA CLEANING STATE ---
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [trimStrings, setTrimStrings] = useState(true);
  const [textNormalizeMode, setTextNormalizeMode] = useState<TextNormalizeMode>('trim');
  const [normalizeDateIso, setNormalizeDateIso] = useState<boolean>(false);
  const [convertType, setConvertType] = useState<'none' | 'numeric' | 'date' | 'boolean' | 'text'>('none');
  const [selectedColumn, setSelectedColumn] = useState<string>(() => currentStats.columns[0]?.name || '');
  const [missingAction, setMissingAction] = useState<'keep' | MissingAction>('fill_mean');
  const [outlierAction, setOutlierAction] = useState<'keep' | 'drop_row' | 'cap_bounds'>('cap_bounds');
  const [outlierMethod, setOutlierMethod] = useState<OutlierMethod>('iqr');
  const [customValue, setCustomValue] = useState<string>('0');
  const [cleaningRules, setCleaningRules] = useState<CleaningRule[]>([]);
  const [appliedReport, setAppliedReport] = useState<CleaningReport | null>(null);
  const [cleanedRows, setCleanedRows] = useState<Record<string, any>[] | null>(null);

  // --- ETL TRANSFORMATION STATE ---
  const [etlType, setEtlType] = useState<EtlOperation['type']>('calculated_column');
  const [etlColA, setEtlColA] = useState<string>(() => currentStats.numericCols[0] || currentStats.columns[0]?.name || '');
  const [etlColB, setEtlColB] = useState<string>(() => currentStats.categoricalCols[0] || currentStats.columns[0]?.name || '');
  const [etlTextA, setEtlTextA] = useState<string>('Margin_Pct');
  const [etlTextB, setEtlTextB] = useState<string>('');
  const [etlAggFn, setEtlAggFn] = useState<EtlAggregationFn>('sum');
  const [etlNormMethod, setEtlNormMethod] = useState<'minmax' | 'zscore'>('minmax');
  const [etlFilterOp, setEtlFilterOp] = useState<'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'not_null'>('gt');
  const [etlPreviewRows, setEtlPreviewRows] = useState<Record<string, any>[] | null>(null);
  const [etlSummaryText, setEtlSummaryText] = useState<string>('');
  const [etlError, setEtlError] = useState<string | null>(null);

  // --- DATASET MERGE / JOIN STATE ---
  const [rightDatasetId, setRightDatasetId] = useState<string>(() => datasets.find(d => d.id !== selectedDataset?.id)?.id || datasets[0]?.id || '');
  const [joinType, setJoinType] = useState<'inner' | 'left'>('left');
  const [leftKey, setLeftKey] = useState<string>(() => currentStats.columns[0]?.name || '');
  const [rightKey, setRightKey] = useState<string>('');
  const [mergeResult, setMergeResult] = useState<{ data: Record<string, any>[]; summary: string; overlapCount: number } | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const rightDataset = useMemo(() => datasets.find(d => d.id === rightDatasetId) || null, [datasets, rightDatasetId]);
  const rightColumns = useMemo(() => (rightDataset?.data?.[0] ? Object.keys(rightDataset.data[0]) : []), [rightDataset]);

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
      type: targetMeta?.type || 'text',
    };
  }, [selectedDataset, selectedColumn, currentStats]);

  const handleAddRule = () => {
    const newRule: CleaningRule = {
      column: selectedColumn,
      missingAction: missingAction !== 'keep' ? missingAction : undefined,
      outlierAction: outlierAction !== 'keep' ? outlierAction : undefined,
      outlierMethod,
      customFillValue: missingAction === 'fill_custom' ? customValue : undefined,
      trimWhitespace: trimStrings,
      textNormalizeMode: trimStrings ? textNormalizeMode : 'none',
      normalizeDateIso,
      convertType: convertType !== 'none' ? convertType : undefined,
    };

    const updatedRules = [...cleaningRules.filter(r => r.column !== selectedColumn), newRule];
    setCleaningRules(updatedRules);

    const { cleanedData, report } = cleanDataset(selectedDataset?.data || [], updatedRules, removeDuplicates);
    setCleanedRows(cleanedData);
    setAppliedReport(report);
  };

  const handleCommit = () => {
    if (!cleanedRows) return;
    saveCleanedDataset(
      cleanedRows,
      selectedDataset?.name || 'Dataset',
      appliedReport?.appliedRules.join('; ') || 'Data cleaning executed'
    );
    logActivity(
      'DATA_CLEANING',
      'Dataset',
      selectedDataset?.name || 'Dataset',
      `Applied ${appliedReport?.appliedRules.length || 0} cleaning rules`
    );
  };

  const handleReset = () => {
    setCleaningRules([]);
    setAppliedReport(null);
    setCleanedRows(null);
  };

  const handleRunEtlPreview = () => {
    setEtlError(null);
    const raw = selectedDataset?.data || [];
    let op: EtlOperation;
    switch (etlType) {
      case 'calculated_column':
        op = {
          type: 'calculated_column',
          newColumnName: etlTextA || 'Calculated_Col',
          expression: etlTextB || `[${currentStats.numericCols[0] || etlColA}] * 1`,
        };
        break;
      case 'group_by':
        op = {
          type: 'group_by',
          groupColumns: [etlColB],
          aggregations: [{ column: etlColA, fn: etlAggFn }],
        };
        break;
      case 'pivot':
        op = {
          type: 'pivot',
          rowColumn: etlColB,
          pivotColumn: currentStats.categoricalCols[1] || etlColB,
          valueColumn: etlColA,
          fn: etlAggFn,
        };
        break;
      case 'unpivot':
        op = {
          type: 'unpivot',
          idColumns: [etlColB],
          valueColumns: currentStats.numericCols.slice(0, 3),
          variableName: 'Metrik',
          valueName: 'Nilai',
        };
        break;
      case 'filter_rows':
        op = {
          type: 'filter_rows',
          column: etlColA,
          operator: etlFilterOp,
          value: etlTextB,
        };
        break;
      case 'rename_column':
        op = {
          type: 'rename_column',
          fromColumn: etlColA,
          toColumn: etlTextA || `${etlColA}_Baru`,
        };
        break;
      case 'cast_type':
        op = {
          type: 'cast_type',
          column: etlColA,
          targetType: (etlTextA as any) || 'numeric',
        };
        break;
      case 'date_dimensions':
        op = {
          type: 'date_dimensions',
          dateColumn: currentStats.dateCols[0] || etlColA,
        };
        break;
      case 'normalize_numeric':
        op = {
          type: 'normalize_numeric',
          column: etlColA,
          method: etlNormMethod,
        };
        break;
    }

    const res = applyEtlTransform(raw, op);
    if (!res.success) {
      setEtlError(res.error || 'Transformasi gagal dijalankan.');
      setEtlPreviewRows(null);
      return;
    }
    setEtlPreviewRows(res.data);
    setEtlSummaryText(res.summary);
  };

  const handleSaveEtlDataset = () => {
    if (!etlPreviewRows) return;
    saveTransformedDataset(
      etlPreviewRows,
      `${selectedDataset?.name || 'Dataset'} (ETL: ${etlType})`,
      'ETL_TRANSFORMATION',
      etlSummaryText,
      'transformed'
    );
    addToast('success', 'Dataset Hasil ETL Disimpan', etlSummaryText);
    setEtlPreviewRows(null);
  };

  const handleRunMerge = () => {
    setMergeError(null);
    setMergeResult(null);
    const res = mergeDatasetsByKey({
      leftData: selectedDataset?.data || [],
      rightData: rightDataset?.data || [],
      leftKey,
      rightKey: rightKey || rightColumns[0] || '',
      joinType,
    });
    if (!res.success) {
      setMergeError(res.error || 'Merge gagal dijalankan.');
      return;
    }
    setMergeResult({ data: res.data, summary: res.summary, overlapCount: res.overlapCount });
  };

  const handleCommitMerge = () => {
    if (!mergeResult) return;
    saveTransformedDataset(
      mergeResult.data,
      `${selectedDataset?.name || 'Left'} + ${rightDataset?.name || 'Right'}`,
      'DATASET_JOIN_MERGE',
      mergeResult.summary,
      'merged'
    );
    addToast('success', 'Dataset Gabungan Tersimpan', mergeResult.summary);
    setMergeResult(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Data Cleaning, Normalisasi & ETL Transformation</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Pembersihan missing values (Mean/Median/Mode/FFill/BFill), outliers (IQR/Z-Score/Percentile), standarisasi tanggal/teks, transformasi ETL, & Join multi-dataset.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs self-start">
          <button
            type="button"
            onClick={() => setModuleTab('cleaning')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-theme cursor-pointer ${
              moduleTab === 'cleaning'
                ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Data Cleaning</span>
          </button>
          <button
            type="button"
            onClick={() => setModuleTab('etl')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-theme cursor-pointer ${
              moduleTab === 'etl'
                ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>ETL Engine</span>
          </button>
          <button
            type="button"
            onClick={() => setModuleTab('merge')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-theme cursor-pointer ${
              moduleTab === 'merge'
                ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Join / Merge</span>
          </button>
        </div>
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

      {/* PANEL 1: DATA CLEANING */}
      {moduleTab === 'cleaning' && (
        <>
          <div className="p-6 rounded-2xl surface-card space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
              <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Konfigurasi Aturan Cleaning & Standarisasi</span>
              </h2>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-[var(--text-main)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeDuplicates}
                    onChange={(e) => setRemoveDuplicates(e.target.checked)}
                    className="rounded border-[var(--border-color)] accent-[var(--color-primary)]"
                  />
                  <span>Hapus Duplikasi</span>
                </label>
                <label className="flex items-center gap-2 text-[var(--text-main)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trimStrings}
                    onChange={(e) => setTrimStrings(e.target.checked)}
                    className="rounded border-[var(--border-color)] accent-[var(--color-primary)]"
                  />
                  <span>Normalisasi Teks</span>
                </label>
                <label className="flex items-center gap-2 text-[var(--text-main)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalizeDateIso}
                    onChange={(e) => setNormalizeDateIso(e.target.checked)}
                    className="rounded border-[var(--border-color)] accent-[var(--color-primary)]"
                  />
                  <span>Tanggal ISO (YYYY-MM-DD)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="dc-col" className="text-[var(--text-main)] font-semibold block mb-1">
                  Pilih Kolom Target
                </label>
                <select
                  id="dc-col"
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
                >
                  {currentStats.columns.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.type}) {c.missingCount > 0 ? `· ${c.missingCount} null` : ''}
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 text-[11px] text-[var(--text-secondary)] tabular-nums">
                  Missing: <strong style={{ color: 'var(--color-danger)' }}>{currentAnomalies.missing}</strong> · IQR Outliers:{' '}
                  <strong style={{ color: 'var(--color-warning)' }}>{currentAnomalies.outliersCount}</strong>
                </div>
              </div>

              <div>
                <label htmlFor="dc-missing" className="text-[var(--text-main)] font-semibold block mb-1">
                  Penanganan Missing Value
                </label>
                <select
                  id="dc-missing"
                  value={missingAction}
                  onChange={(e) => setMissingAction(e.target.value as any)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
                >
                  <option value="keep">Biarkan</option>
                  <option value="drop_row">Drop Baris Kosong</option>
                  {currentAnomalies.type === 'numeric' && (
                    <>
                      <option value="fill_mean">Imputasi Mean (Rata-rata)</option>
                      <option value="fill_median">Imputasi Median</option>
                    </>
                  )}
                  <option value="fill_mode">Imputasi Mode (Nilai Tersering)</option>
                  <option value="fill_ffill">Forward-Fill (Nilai Sebelumnya)</option>
                  <option value="fill_bfill">Backward-Fill (Nilai Berikutnya)</option>
                  <option value="fill_custom">Isi Nilai Kustom</option>
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
                  Penanganan Outlier ({outlierMethod.toUpperCase()})
                </label>
                <div className="flex gap-1.5">
                  <select
                    id="dc-outlier"
                    value={outlierAction}
                    onChange={(e) => setOutlierAction(e.target.value as any)}
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2.5 py-2 text-[var(--text-main)]"
                  >
                    <option value="keep">Pertahankan</option>
                    <option value="cap_bounds">Cap ke Batas</option>
                    <option value="drop_row">Drop Outlier</option>
                  </select>
                  <select
                    aria-label="Metode Deteksi Outlier"
                    value={outlierMethod}
                    onChange={(e) => setOutlierMethod(e.target.value as OutlierMethod)}
                    className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2 py-2 text-[var(--text-main)]"
                  >
                    <option value="iqr">IQR</option>
                    <option value="zscore">Z-Score</option>
                    <option value="percentile">P5–P95</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="dc-textmode" className="text-[var(--text-main)] font-semibold block mb-1">
                  Format Teks & Tipe Data
                </label>
                <div className="flex gap-1.5">
                  <select
                    id="dc-textmode"
                    value={textNormalizeMode}
                    onChange={(e) => setTextNormalizeMode(e.target.value as TextNormalizeMode)}
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2 py-2 text-[var(--text-main)]"
                  >
                    <option value="trim">Trim Spasi</option>
                    <option value="titlecase">Title Case</option>
                    <option value="lowercase">lowercase</option>
                    <option value="uppercase">UPPERCASE</option>
                    <option value="none">No Change</option>
                  </select>
                  <select
                    aria-label="Konversi Tipe"
                    value={convertType}
                    onChange={(e) => setConvertType(e.target.value as any)}
                    className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2 py-2 text-[var(--text-main)]"
                  >
                    <option value="none">Asli</option>
                    <option value="numeric">Numeric</option>
                    <option value="date">Date</option>
                    <option value="boolean">Bool</option>
                    <option value="text">Text</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                {cleaningRules.length} Aturan kolom aktif
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

          {/* Cleaning Report & Before vs After Diff */}
          {appliedReport && cleanedRows && (
            <div className="p-6 rounded-2xl surface-card border-[var(--accent-caramel)] space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
                <div>
                  <div className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                    <span>Audit Trail & Before/After Comparison</span>
                  </div>
                  <div className="text-xs text-[var(--text-main)] mt-1 tabular-nums">
                    Baris: {appliedReport.originalRowCount} ➔ {appliedReport.newRowCount} · Duplikat dihapus: {appliedReport.duplicatesRemoved} · Missing ditangani: {appliedReport.missingValuesHandled} · Outliers disesuaikan: {appliedReport.outliersAdjusted}
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

              {appliedReport.columnDiffs.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase font-bold">
                      <tr>
                        <th className="px-3 py-2">Kolom</th>
                        <th className="px-3 py-2">Missing (Sebelum ➔ Sesudah)</th>
                        <th className="px-3 py-2">Unique (Sebelum ➔ Sesudah)</th>
                        <th className="px-3 py-2">Outliers Disesuaikan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] font-mono">
                      {appliedReport.columnDiffs.map(d => (
                        <tr key={d.column}>
                          <td className="px-3 py-2 font-bold">{d.column}</td>
                          <td className="px-3 py-2">
                            {d.missingBefore} ➔ <span style={{ color: 'var(--color-success)' }}>{d.missingAfter}</span>
                          </td>
                          <td className="px-3 py-2">
                            {d.uniqueBefore} ➔ {d.uniqueAfter}
                          </td>
                          <td className="px-3 py-2">{d.outliersAdjusted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-3.5 rounded-xl surface-secondary space-y-1.5">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Log Operasi Cleaning
                </span>
                <ul className="space-y-1 text-xs text-[var(--text-main)] list-disc list-inside">
                  {appliedReport.appliedRules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* PANEL 2: ETL / ELT TRANSFORMATION ENGINE */}
      {moduleTab === 'etl' && (
        <div className="p-6 rounded-2xl surface-card space-y-5 text-xs">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <Workflow className="w-4 h-4 text-[var(--color-primary)]" />
              <span>ETL / ELT Transformation Builder</span>
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Buat kolom kalkulasi berbasis formula aman, agregasi GroupBy, Pivot, Unpivot, Normalisasi Z-Score/Min-Max, dan ekstraksi dimensi waktu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="etl-op" className="font-semibold block mb-1">Operasi ETL</label>
              <select
                id="etl-op"
                value={etlType}
                onChange={(e) => setEtlType(e.target.value as any)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
              >
                <option value="calculated_column">Calculated Column (Formula)</option>
                <option value="group_by">GroupBy & Agregasi</option>
                <option value="pivot">Pivot Table</option>
                <option value="unpivot">Unpivot (Melt)</option>
                <option value="filter_rows">Filter Baris</option>
                <option value="rename_column">Rename Kolom</option>
                <option value="date_dimensions">Ekstrak Dimensi Tanggal (Year/Quarter/Month)</option>
                <option value="normalize_numeric">Normalisasi Numerik (Min-Max / Z-Score)</option>
                <option value="cast_type">Cast Tipe Kolom</option>
              </select>
            </div>

            <div>
              <label htmlFor="etl-col-a" className="font-semibold block mb-1">
                {etlType === 'group_by' || etlType === 'pivot' ? 'Kolom Nilai / Metrik' : 'Kolom Target Utama'}
              </label>
              <select
                id="etl-col-a"
                value={etlColA}
                onChange={(e) => setEtlColA(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
              >
                {currentStats.columns.map(c => (
                  <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>

            {['group_by', 'pivot', 'unpivot'].includes(etlType) ? (
              <div>
                <label htmlFor="etl-col-b" className="font-semibold block mb-1">Kolom Dimensi / ID</label>
                <select
                  id="etl-col-b"
                  value={etlColB}
                  onChange={(e) => setEtlColB(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
                >
                  {currentStats.columns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : etlType === 'calculated_column' ? (
              <div>
                <label htmlFor="etl-text-a" className="font-semibold block mb-1">Nama Kolom Baru</label>
                <input
                  id="etl-text-a"
                  type="text"
                  value={etlTextA}
                  onChange={(e) => setEtlTextA(e.target.value)}
                  placeholder="Contoh: Margin_Ratio"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
                />
              </div>
            ) : etlType === 'normalize_numeric' ? (
              <div>
                <label htmlFor="etl-norm" className="font-semibold block mb-1">Metode Normalisasi</label>
                <select
                  id="etl-norm"
                  value={etlNormMethod}
                  onChange={(e) => setEtlNormMethod(e.target.value as any)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
                >
                  <option value="minmax">Min-Max Scaling (0..1)</option>
                  <option value="zscore">Z-Score Standardization</option>
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="etl-text-alt" className="font-semibold block mb-1">
                  {etlType === 'filter_rows' ? 'Operator Filter' : etlType === 'cast_type' ? 'Tipe Tujuan' : 'Nama Baru'}
                </label>
                {etlType === 'filter_rows' ? (
                  <select
                    id="etl-text-alt"
                    value={etlFilterOp}
                    onChange={(e) => setEtlFilterOp(e.target.value as any)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
                  >
                    <option value="gt">Lebih Besar Dari (&gt;)</option>
                    <option value="gte">Lebih Besar / Sama Dengan (≥)</option>
                    <option value="lt">Lebih Kecil Dari (&lt;)</option>
                    <option value="equals">Sama Dengan (=)</option>
                    <option value="contains">Mengandung Teks</option>
                    <option value="not_null">Tidak Kosong (Not Null)</option>
                  </select>
                ) : etlType === 'cast_type' ? (
                  <select
                    id="etl-text-alt"
                    value={etlTextA}
                    onChange={(e) => setEtlTextA(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
                  >
                    <option value="numeric">numeric</option>
                    <option value="date">date</option>
                    <option value="boolean">boolean</option>
                    <option value="text">text</option>
                  </select>
                ) : (
                  <input
                    id="etl-text-alt"
                    type="text"
                    value={etlTextA}
                    onChange={(e) => setEtlTextA(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
                  />
                )}
              </div>
            )}
          </div>

          {(etlType === 'calculated_column' || etlType === 'filter_rows' || etlType === 'group_by' || etlType === 'pivot') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {etlType === 'calculated_column' && (
                <div className="md:col-span-2">
                  <label htmlFor="etl-expr" className="font-semibold block mb-1">
                    Formula Aritmetika Aman (gunakan <code className="text-[var(--color-primary)]">[NamaKolom]</code>, contoh: <code>[Profit] / [Revenue] * 100</code>)
                  </label>
                  <input
                    id="etl-expr"
                    type="text"
                    value={etlTextB}
                    onChange={(e) => setEtlTextB(e.target.value)}
                    placeholder="[Profit] / [Revenue] * 100"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 font-mono text-[var(--text-main)]"
                  />
                </div>
              )}
              {etlType === 'filter_rows' && etlFilterOp !== 'not_null' && (
                <div>
                  <label htmlFor="etl-fval" className="font-semibold block mb-1">Nilai Pembanding</label>
                  <input
                    id="etl-fval"
                    type="text"
                    value={etlTextB}
                    onChange={(e) => setEtlTextB(e.target.value)}
                    placeholder="Contoh: 1000000 atau Jabodetabek"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
                  />
                </div>
              )}
              {(etlType === 'group_by' || etlType === 'pivot') && (
                <div>
                  <label htmlFor="etl-fn" className="font-semibold block mb-1">Fungsi Agregasi</label>
                  <select
                    id="etl-fn"
                    value={etlAggFn}
                    onChange={(e) => setEtlAggFn(e.target.value as EtlAggregationFn)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
                  >
                    <option value="sum">SUM (Total)</option>
                    <option value="avg">AVG (Rata-rata)</option>
                    <option value="min">MIN</option>
                    <option value="max">MAX</option>
                    <option value="count">COUNT</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={handleRunEtlPreview}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold cursor-pointer"
            >
              Preview Hasil Transformasi
            </button>
          </div>

          {etlError && (
            <div className="p-3 rounded-xl flex items-center gap-2 border border-[var(--color-danger)]" style={{ backgroundColor: 'var(--bg-danger-soft)', color: 'var(--color-danger)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{etlError}</span>
            </div>
          )}

          {etlPreviewRows && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-[var(--color-success)]">{etlSummaryText}</span>
                <button
                  type="button"
                  onClick={handleSaveEtlDataset}
                  style={{ backgroundColor: 'var(--color-success)' }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[#FFFDF9] font-semibold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan sebagai Dataset Baru</span>
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] max-h-60">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[var(--bg-secondary)] uppercase font-bold">
                    <tr>
                      {Object.keys(etlPreviewRows[0] || {}).map(col => (
                        <th key={col} className="px-3 py-2 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] font-mono">
                    {etlPreviewRows.slice(0, 8).map((r, i) => (
                      <tr key={i}>
                        {Object.keys(r).map((k, j) => (
                          <td key={j} className="px-3 py-1.5 whitespace-nowrap">{String(r[k] ?? '-')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PANEL 3: KEY-VALIDATED DATASET MERGE / JOIN */}
      {moduleTab === 'merge' && (
        <div className="p-6 rounded-2xl surface-card space-y-5 text-xs">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Multi-Dataset Join / Merge (Dengan Validasi Kecocokan Key)</span>
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Gabungkan dataset aktif ({selectedDataset?.name}) dengan dataset lain berdasarkan kolom kunci yang cocok. Sistem memblokir penggabungan otomatis apabila overlap key = 0.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="merge-right" className="font-semibold block mb-1">Dataset Kedua (Kanan)</label>
              <select
                id="merge-right"
                value={rightDatasetId}
                onChange={(e) => {
                  setRightDatasetId(e.target.value);
                  setRightKey('');
                }}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
              >
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="merge-lkey" className="font-semibold block mb-1">Join Key Kiri</label>
              <select
                id="merge-lkey"
                value={leftKey}
                onChange={(e) => setLeftKey(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
              >
                {currentStats.columns.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="merge-rkey" className="font-semibold block mb-1">Join Key Kanan</label>
              <select
                id="merge-rkey"
                value={rightKey || rightColumns[0] || ''}
                onChange={(e) => setRightKey(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
              >
                {rightColumns.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="merge-type" className="font-semibold block mb-1">Tipe Join</label>
              <select
                id="merge-type"
                value={joinType}
                onChange={(e) => setJoinType(e.target.value as any)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)]"
              >
                <option value="left">LEFT JOIN</option>
                <option value="inner">INNER JOIN</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRunMerge}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold cursor-pointer"
            >
              Validasi Key & Preview Join
            </button>
          </div>

          {mergeError && (
            <div className="p-3 rounded-xl flex items-center gap-2 border border-[var(--color-danger)]" style={{ backgroundColor: 'var(--bg-danger-soft)', color: 'var(--color-danger)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{mergeError}</span>
            </div>
          )}

          {mergeResult && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-[var(--color-success)]">{mergeResult.summary}</span>
                <button
                  type="button"
                  onClick={handleCommitMerge}
                  style={{ backgroundColor: 'var(--color-success)' }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[#FFFDF9] font-semibold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Dataset Gabungan</span>
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] max-h-60">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[var(--bg-secondary)] uppercase font-bold">
                    <tr>
                      {Object.keys(mergeResult.data[0] || {}).map(col => (
                        <th key={col} className="px-3 py-2 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] font-mono">
                    {mergeResult.data.slice(0, 8).map((r, i) => (
                      <tr key={i}>
                        {Object.keys(r).map((k, j) => (
                          <td key={j} className="px-3 py-1.5 whitespace-nowrap">{String(r[k] ?? '-')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
