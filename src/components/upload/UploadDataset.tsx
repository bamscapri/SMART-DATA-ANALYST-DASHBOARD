import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  parseUploadedDocument,
  parseRemoteIngestPayload,
  combineParsedDatasets,
  ParsedDocumentResult,
} from '../../utils/fileParser';
import { profileDataset } from '../../utils/dataProfiler';
import { generateUniqueId } from '../../utils/idGenerator';
import type { LineageStep } from '../../data/seedDatasets';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  Trash2,
  RefreshCw,
  Layers,
  ArrowRight,
  Link2,
  FileText,
  Table2,
  CheckCircle2,
  Sparkles,
  Files,
} from 'lucide-react';

type PipelineStageKey =
  | 'INGESTION'
  | 'EXTRACTION'
  | 'PROFILING'
  | 'ANALYSIS'
  | 'STATISTICAL'
  | 'INSIGHTS'
  | 'REPORT';

interface StageStatus {
  key: PipelineStageKey;
  label: string;
  state: 'idle' | 'running' | 'done' | 'failed';
  detail?: string;
}

const INITIAL_STAGES: StageStatus[] = [
  { key: 'INGESTION', label: '1. Data Ingestion', state: 'idle' },
  { key: 'EXTRACTION', label: '2. Multi-Format Extraction', state: 'idle' },
  { key: 'PROFILING', label: '3. Data Profiling & Quality Check', state: 'idle' },
  { key: 'ANALYSIS', label: '4. EDA & Mode Classification', state: 'idle' },
  { key: 'STATISTICAL', label: '5. Statistical & Mining Engine', state: 'idle' },
  { key: 'INSIGHTS', label: '6. Automated Insights (10 Kategori)', state: 'idle' },
  { key: 'REPORT', label: '7. Executive Report Ready', state: 'idle' },
];

export const UploadDataset: React.FC = () => {
  const { addDataset, setCurrentView, selectDataset, currentUser, addToast } = useApp();

  const [sourceTab, setSourceTab] = useState<'file' | 'url'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stages, setStages] = useState<StageStatus[]>(INITIAL_STAGES);

  // Local multi-file state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [combineMultiFiles, setCombineMultiFiles] = useState<boolean>(true);
  const [parsedResults, setParsedResults] = useState<ParsedDocumentResult[]>([]);
  const [parsedPreview, setParsedPreview] = useState<ParsedDocumentResult | null>(null);

  // URL import state
  const [remoteUrl, setRemoteUrl] = useState('');
  const [lastUrlRetry, setLastUrlRetry] = useState<string | null>(null);

  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [datasetName, setDatasetName] = useState<string>('');
  const [datasetDesc, setDatasetDesc] = useState<string>('');
  const [sourceTypeUsed, setSourceTypeUsed] = useState<'file' | 'url' | 'merged'>('file');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateStage = (key: PipelineStageKey, state: StageStatus['state'], detail?: string) => {
    setStages(prev => prev.map(s => (s.key === key ? { ...s, state, detail } : s)));
  };

  const resetStages = () => setStages(INITIAL_STAGES.map(s => ({ ...s, state: 'idle', detail: undefined })));

  const finalizeParsedPreview = async (
    results: ParsedDocumentResult[],
    originType: 'file' | 'url',
    originUrl?: string
  ) => {
    if (results.length === 0) {
      throw new Error('Tidak ada file atau sumber data yang berhasil diekstrak.');
    }

    updateStage('PROFILING', 'running', 'Menghitung tipe kolom semantik & Data Quality Score');

    let finalPreview: ParsedDocumentResult;
    let finalOriginType: 'file' | 'url' | 'merged' = originType;

    if (results.length > 1 && combineMultiFiles) {
      const { data: combinedRows, warnings } = combineParsedDatasets(results);
      finalOriginType = 'merged';
      finalPreview = {
        fileName: results.map(r => r.fileName).join(' + '),
        fileType: results[0].fileType,
        fileSize: results.reduce((s, r) => s + r.fileSize, 0),
        data: combinedRows,
        analysisMode: 'structured',
        warnings: [...(results.flatMap(r => r.warnings || [])), ...warnings],
      };
      setDatasetName(`Gabungan_${results.length}_Sumber`);
      setDatasetDesc(
        `Dataset gabungan dari ${results.length} file (${results.map(r => r.fileName).join(', ')})`
      );
    } else {
      finalPreview = results[0];
      const baseName = finalPreview.fileName.replace(/\.[^/.]+$/, '');
      setDatasetName(baseName);
      setDatasetDesc(
        originUrl
          ? `Diimpor dari URL (${finalPreview.fileType.toUpperCase()}): ${originUrl}`
          : `Dataset diekstrak dari ${finalPreview.fileName} (${(finalPreview.fileSize / 1024).toFixed(1)} KB)`
      );
    }

    const prof = profileDataset(finalPreview.data);
    updateStage(
      'PROFILING',
      'done',
      `${prof.rowCount} baris · ${prof.colCount} kolom · Skor Kualitas ${prof.quality.overallScore}/100`
    );

    updateStage(
      'ANALYSIS',
      'done',
      finalPreview.analysisMode === 'document'
        ? `Mode: Document Intelligence (${finalPreview.documentContent?.pageCount || 1} hal)`
        : `Mode: Structured Data (${prof.readiness.isForecastable ? 'Time-Series Ready' : 'Cross-Sectional'})`
    );
    updateStage('STATISTICAL', 'done', 'EDA, Uji Hipotesis & Data Mining siap dijalankan');
    updateStage('INSIGHTS', 'done', 'Siap menghasilkan 10 Kategori Insight Otomatis');
    updateStage('REPORT', 'done', 'Pipeline pra-simpan selesai 100%');

    setSourceTypeUsed(finalOriginType);
    setParsedResults(results);
    setParsedPreview(finalPreview);

    if (finalPreview.sheets && finalPreview.sheets.length > 0) {
      setSelectedSheetName(finalPreview.activeSheetName || finalPreview.sheets[0].name);
    } else {
      setSelectedSheetName('');
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const filesArr = Array.from(fileList);
    setErrorMessage(null);
    setIsProcessing(true);
    resetStages();
    setSelectedFiles(filesArr);
    setLastUrlRetry(null);

    try {
      updateStage('INGESTION', 'running', `Membaca ${filesArr.length} file lokal...`);
      for (const f of filesArr) {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        if (!['xlsx', 'xls', 'csv', 'pdf', 'docx', 'doc', 'json'].includes(ext)) {
          throw new Error(
            `Format file "${f.name}" (.${ext}) belum didukung. Gunakan .xlsx, .xls, .csv, .pdf, .docx, atau .json.`
          );
        }
      }
      updateStage('INGESTION', 'done', `${filesArr.length} file tervalidasi`);

      updateStage('EXTRACTION', 'running', 'Mengekstrak tabel, sheet, formula, & struktur dokumen...');
      const parsedAll: ParsedDocumentResult[] = [];
      for (const f of filesArr) {
        const res = await parseUploadedDocument(f);
        parsedAll.push(res);
      }
      updateStage(
        'EXTRACTION',
        'done',
        `${parsedAll.reduce((s, r) => s + r.data.length, 0)} total baris terekstrak`
      );

      await finalizeParsedPreview(parsedAll, 'file');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses dan mengekstrak file.');
      setStages(prev =>
        prev.map(s => (s.state === 'running' ? { ...s, state: 'failed', detail: err.message } : s))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlImport = async (urlOverride?: string) => {
    const targetUrl = (urlOverride || remoteUrl).trim();
    if (!targetUrl) {
      setErrorMessage('Masukkan URL sumber data (CSV, Excel, PDF, Word, atau REST API JSON).');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    resetStages();
    setSelectedFiles([]);
    setLastUrlRetry(targetUrl);

    try {
      updateStage('INGESTION', 'running', `Mengunduh via proxy aman SSRF: ${targetUrl}`);
      const res = await fetch('/api/ingest/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || `Gagal mengunduh dari URL (HTTP ${res.status}).`);
      }
      updateStage(
        'INGESTION',
        'done',
        `Unduhan berhasil (${Math.round((payload.byteLength || 0) / 1024)} KB · ${payload.format.toUpperCase()})`
      );

      updateStage('EXTRACTION', 'running', `Mengekstrak format ${payload.format.toUpperCase()}...`);
      const parsed = await parseRemoteIngestPayload(payload);
      updateStage('EXTRACTION', 'done', `${parsed.data.length} baris berhasil diekstrak`);

      await finalizeParsedPreview([parsed], 'url', payload.finalUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengimpor dataset dari URL.');
      setStages(prev =>
        prev.map(s => (s.state === 'running' ? { ...s, state: 'failed', detail: err.message } : s))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommitPipeline = (navigateTo: 'explorer' | 'insights' | 'summary') => {
    if (!parsedPreview) return;

    const nowIso = new Date().toISOString();
    const saveSingleOrSelected = (res: ParsedDocumentResult, idx: number, overrideName?: string) => {
      let finalData = res.data;
      if (res.sheets && selectedSheetName && idx === 0) {
        const target = res.sheets.find(s => s.name === selectedSheetName);
        if (target) finalData = target.data;
      }

      const newId = generateUniqueId('ds_ingest');
      const initialLineage: LineageStep[] = [
        {
          id: generateUniqueId('lin'),
          timestamp: nowIso,
          stage: 'INGESTION',
          action: sourceTypeUsed === 'url' ? 'URL_INGEST' : sourceTypeUsed === 'merged' ? 'MULTI_FILE_MERGE' : 'FILE_UPLOAD',
          details:
            sourceTypeUsed === 'url'
              ? `Diimpor dari URL ${remoteUrl}`
              : `Diunggah dari ${res.fileName} (${(res.fileSize / 1024).toFixed(1)} KB)`,
          userName: currentUser.fullName,
          outputRows: finalData.length,
          sourceRef: res.fileName,
        },
        {
          id: generateUniqueId('lin'),
          timestamp: nowIso,
          stage: 'PROFILING',
          action: 'AUTO_PROFILING_PIPELINE',
          details: `Mode: ${res.analysisMode || 'structured'} · Sheet: ${selectedSheetName || res.activeSheetName || 'Primary'}`,
          userName: currentUser.fullName,
          inputRows: finalData.length,
          outputRows: finalData.length,
        },
      ];

      addDataset(
        {
          id: newId,
          name: overrideName || res.fileName.replace(/\.[^/.]+$/, ''),
          description: datasetDesc.trim() || `Diekstrak dari ${res.fileName}`,
          fileName: res.fileName,
          fileType: res.fileType,
          fileSize: res.fileSize,
          uploadedAt: nowIso,
          data: finalData,
          sheets: res.sheets,
          activeSheet: idx === 0 ? selectedSheetName || res.sheets?.[0]?.name : res.sheets?.[0]?.name,
          analysisMode: res.analysisMode || 'structured',
          documentContent: res.documentContent,
          sourceMeta: {
            sourceType: sourceTypeUsed,
            sourceUrl: sourceTypeUsed === 'url' ? remoteUrl.trim() : undefined,
            extractedAt: nowIso,
            sheetCount: res.sheets?.length || 1,
            originalFiles: selectedFiles.length > 0 ? selectedFiles.map(f => f.name) : [res.fileName],
          },
          lineage: initialLineage,
        },
        idx === 0 ? selectedFiles[0] : undefined
      );

      return newId;
    };

    let primaryId = '';
    if (parsedResults.length > 1 && !combineMultiFiles) {
      parsedResults.forEach((res, idx) => {
        const createdId = saveSingleOrSelected(res, idx);
        if (idx === 0) primaryId = createdId;
      });
      addToast('success', `${parsedResults.length} Dataset Tersimpan`, 'Seluruh file berhasil dimuat sebagai dataset terpisah.');
    } else {
      primaryId = saveSingleOrSelected(parsedPreview, 0, datasetName.trim() || parsedPreview.fileName);
    }

    if (primaryId) selectDataset(primaryId);
    setCurrentView(navigateTo);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Data Ingestion & Automated Extraction Pipeline</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Unggah multi-file lokal (Excel, CSV, PDF, Word, JSON) atau impor langsung dari URL eksternal secara aman. Sistem otomatis mengekstrak tabel, formula, teks dokumen, & menjalankan pipeline analisis.
          </p>
        </div>

        {/* Source Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs self-start">
          <button
            type="button"
            onClick={() => setSourceTab('file')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-theme cursor-pointer ${
              sourceTab === 'file'
                ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            <Files className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceTab('url')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-theme cursor-pointer ${
              sourceTab === 'url'
                ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Import dari URL</span>
          </button>
        </div>
      </div>

      {/* Source Input Area */}
      {sourceTab === 'file' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-[var(--text-secondary)]">
              Mendukung multi-file sekaligus (.xlsx, .xls, .csv, .pdf, .docx, .json)
            </span>
            <label className="flex items-center gap-2 text-[var(--text-main)] cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={combineMultiFiles}
                onChange={(e) => setCombineMultiFiles(e.target.checked)}
                className="accent-[var(--color-primary)] rounded"
              />
              <span>Gabungkan multi-file menjadi 1 tabel terpadu</span>
            </label>
          </div>

          <button
            type="button"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-theme block ${
              isDragging
                ? 'border-[var(--color-primary)] bg-[var(--bg-caramel-soft)]'
                : 'border-[var(--border-color)] hover:border-[var(--accent-caramel)] bg-[var(--bg-card)] shadow-2xs'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.json"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div
                className="w-14 h-14 rounded-2xl border border-[var(--accent-caramel)] flex items-center justify-center text-[var(--color-primary)]"
                style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
              >
                {isProcessing ? <RefreshCw className="w-7 h-7 animate-spin" /> : <UploadCloud className="w-7 h-7" />}
              </div>

              <div>
                <div className="text-sm font-semibold text-[var(--text-main)]">
                  Drag & Drop satu atau beberapa file ke sini, atau{' '}
                  <span className="text-[var(--color-primary)] underline">Browse File</span>
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  Ekstraksi otomatis multi-sheet Excel, tabel HTML Word (.docx), tabel & OCR PDF, CSV multi-delimiter, dan JSON
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1 text-[11px] font-semibold flex-wrap justify-center">
                {['EXCEL (.XLSX)', 'CSV', 'PDF (TABLE + OCR)', 'WORD (.DOCX)', 'JSON'].map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-main)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </button>
        </div>
      ) : (
        <div className="p-6 rounded-2xl surface-card space-y-4">
          <div className="flex items-start gap-3">
            <div
              className="p-2.5 rounded-xl text-[var(--color-primary)] shrink-0"
              style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
            >
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">
                Impor Sumber Data Eksternal dari URL (SSRF-Protected)
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Masukkan tautan publik langsung menuju file CSV, Excel, PDF, Word (.docx), Google Sheets Export CSV, atau endpoint JSON API (maks 25MB).
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUrlImport();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="url"
              aria-label="URL Sumber Data"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://example.com/dataset.csv atau https://api.example.com/data.json"
              className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
              required
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-[var(--text-on-primary)] text-xs font-semibold flex items-center justify-center gap-2 transition-theme cursor-pointer shrink-0"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              <span>{isProcessing ? 'Mengunduh & Memproses...' : 'Ambil & Ekstrak Data'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Stage-by-Stage Pipeline Status Monitor */}
      {stages.some(s => s.state !== 'idle') && (
        <div className="p-4 rounded-2xl surface-card space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--accent-caramel)]" />
              <span>Monitor Pipeline Pemrosesan Data End-to-End</span>
            </span>
            <span className="font-mono text-[11px] text-[var(--color-primary)]">
              {stages.filter(s => s.state === 'done').length}/{stages.length} Tahap Selesai
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
            {stages.map(st => {
              const color =
                st.state === 'done'
                  ? 'var(--color-success)'
                  : st.state === 'failed'
                  ? 'var(--color-danger)'
                  : st.state === 'running'
                  ? 'var(--color-primary)'
                  : 'var(--text-secondary)';
              return (
                <div
                  key={st.key}
                  className="p-2.5 rounded-xl surface-secondary border border-[var(--border-color)] space-y-1"
                >
                  <div className="flex items-center justify-between gap-1 font-semibold" style={{ color }}>
                    <span className="truncate">{st.label}</span>
                    {st.state === 'done' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    {st.state === 'running' && <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />}
                    {st.state === 'failed' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  </div>
                  {st.detail && (
                    <div className="text-[10px] text-[var(--text-secondary)] line-clamp-2">{st.detail}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Message with Retry */}
      {errorMessage && (
        <div
          className="p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--bg-danger-soft)',
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
          }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="font-medium">{errorMessage}</div>
          </div>
          {lastUrlRetry && (
            <button
              type="button"
              onClick={() => handleUrlImport(lastUrlRetry)}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--color-danger)] text-[var(--color-danger)] font-semibold text-xs cursor-pointer self-start sm:self-auto"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* Warnings (e.g. Scanned PDF or Formulas or Union Merge) */}
      {parsedPreview?.warnings && parsedPreview.warnings.length > 0 && (
        <div
          className="p-3.5 rounded-xl border text-xs space-y-1"
          style={{
            backgroundColor: 'var(--bg-warning-soft)',
            borderColor: 'var(--color-warning)',
            color: 'var(--text-main)',
          }}
        >
          <div className="font-bold" style={{ color: 'var(--color-warning)' }}>
            Catatan Ekstraksi:
          </div>
          <ul className="list-disc list-inside text-[11px] space-y-0.5">
            {parsedPreview.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Parsed Result & Configuration Preview */}
      {parsedPreview && (
        <div className="p-6 rounded-2xl surface-card space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="p-2.5 rounded-lg shrink-0"
                style={{ backgroundColor: 'var(--bg-success-soft)', color: 'var(--color-success)' }}
              >
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[var(--text-main)] truncate">{parsedPreview.fileName}</div>
                <div className="text-xs text-[var(--text-secondary)] tabular-nums flex flex-wrap items-center gap-2">
                  <span>Format: {parsedPreview.fileType.toUpperCase()}</span>
                  <span>· Ukuran: {(parsedPreview.fileSize / 1024).toFixed(1)} KB</span>
                  <span>· Baris: {parsedPreview.data.length}</span>
                  <span
                    className="px-2 py-0.5 rounded font-semibold text-[10px]"
                    style={{
                      backgroundColor: 'var(--bg-caramel-soft)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    {parsedPreview.analysisMode === 'document'
                      ? 'MODE: DOCUMENT INTELLIGENCE'
                      : 'MODE: STRUCTURED DATA'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setParsedPreview(null);
                setParsedResults([]);
                resetStages();
              }}
              aria-label="Batalkan Preview Upload"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--bg-secondary)] transition-theme cursor-pointer shrink-0"
              title="Batalkan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Document Intelligence Summary Box (for PDF / DOCX) */}
          {parsedPreview.documentContent && (
            <div className="p-4 rounded-xl surface-secondary border border-[var(--border-color)] grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase">Halaman / Sheet</span>
                <div className="font-bold text-[var(--text-main)] tabular-nums">
                  {parsedPreview.documentContent.pageCount}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase">Total Kata</span>
                <div className="font-bold text-[var(--text-main)] tabular-nums">
                  {parsedPreview.documentContent.wordCount.toLocaleString('id-ID')}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase">Headings / Bab</span>
                <div className="font-bold text-[var(--text-main)] tabular-nums">
                  {parsedPreview.documentContent.headingCount}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase">Tabel Terdeteksi</span>
                <div className="font-bold text-[var(--color-primary)] tabular-nums">
                  {parsedPreview.documentContent.tableCount} Tabel
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase">OCR / Formula</span>
                <div className="font-bold text-[var(--text-main)]">
                  {parsedPreview.documentContent.ocrApplied
                    ? 'OCR Gemini Aktif'
                    : parsedPreview.documentContent.formulasDetected
                    ? `${parsedPreview.documentContent.formulasDetected} Formula`
                    : 'Teks Digital'}
                </div>
              </div>
            </div>
          )}

          {/* Form Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="up-name" className="text-xs font-semibold text-[var(--text-main)] block mb-1">
                Nama Dataset di Dashboard
              </label>
              <input
                id="up-name"
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
              />
            </div>

            <div>
              <label htmlFor="up-desc" className="text-xs font-semibold text-[var(--text-main)] block mb-1">
                Deskripsi / Catatan Provenance
              </label>
              <input
                id="up-desc"
                type="text"
                value={datasetDesc}
                onChange={(e) => setDatasetDesc(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
              />
            </div>
          </div>

          {/* Multi-sheet / Multi-table Picker */}
          {parsedPreview.sheets && parsedPreview.sheets.length > 1 && (
            <div className="p-3.5 rounded-xl surface-secondary space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main)]">
                <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Terdeteksi Multi-Sheet / Multi-Tabel. Pilih Tabel Utama:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {parsedPreview.sheets.map(sheet => (
                  <button
                    key={sheet.name}
                    type="button"
                    onClick={() => setSelectedSheetName(sheet.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-theme cursor-pointer ${
                      selectedSheetName === sheet.name
                        ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)] font-semibold'
                        : 'bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] hover:bg-[var(--bg-caramel-soft)]'
                    }`}
                  >
                    {sheet.name} ({sheet.data.length} baris)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Table Preview OR Document Preview */}
          {(() => {
            const activeSheetObj = parsedPreview.sheets?.find(s => s.name === selectedSheetName);
            const previewRows = activeSheetObj ? activeSheetObj.data : parsedPreview.data;
            return (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[var(--text-main)] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {parsedPreview.analysisMode === 'document' ? (
                      <FileText className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    ) : (
                      <Table2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    )}
                    <span>Preview Data Hasil Ekstraksi (5 Baris Pertama)</span>
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                    Kolom: {previewRows[0] ? Object.keys(previewRows[0]).length : 0} · Total Baris: {previewRows.length}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] max-h-56">
                  <table className="w-full text-left text-xs text-[var(--text-main)]">
                    <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-[10px] font-bold sticky top-0 border-b border-[var(--border-color)]">
                      <tr>
                        {previewRows[0] &&
                          Object.keys(previewRows[0]).map(col => (
                            <th key={col} className="px-3 py-2.5 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-card)] font-mono text-[11px] tabular-nums">
                      {previewRows.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[var(--bg-caramel-soft)] transition-theme">
                          {Object.keys(row).map((k, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 whitespace-nowrap max-w-[260px] truncate">
                              {String(row[k] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Save / Commit CTA */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setParsedPreview(null)}
              className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-medium border border-[var(--border-color)] transition-theme cursor-pointer"
            >
              Batalkan
            </button>
            <button
              type="button"
              onClick={() => handleCommitPipeline('explorer')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] font-semibold text-xs border border-[var(--border-color)] transition-theme cursor-pointer"
            >
              <span>Simpan & Inspect di Data Explorer</span>
            </button>
            <button
              type="button"
              onClick={() => handleCommitPipeline('insights')}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold text-xs shadow-xs transition-theme active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Jalankan Pipeline Analisis Otomatis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
