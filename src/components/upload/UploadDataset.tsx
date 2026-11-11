import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { parseUploadedDocument, ParsedDocumentResult } from '../../utils/fileParser';
import { generateUniqueId } from '../../utils/idGenerator';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Eye,
  Layers,
  ArrowRight
} from 'lucide-react';

export const UploadDataset: React.FC = () => {
  const { addDataset, setCurrentView, selectDataset } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedPreview, setParsedPreview] = useState<ParsedDocumentResult | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [datasetName, setDatasetName] = useState<string>('');
  const [datasetDesc, setDatasetDesc] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setErrorMessage(null);
    setIsProcessing(true);
    setUploadProgress(25);

    try {
      // Validate file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv', 'pdf', 'docx', 'doc'].includes(ext || '')) {
        throw new Error('Format file tidak didukung. Harap unggah file .xlsx, .xls, .csv, .pdf, atau .docx.');
      }

      setUploadProgress(60);
      const result = await parseUploadedDocument(file);
      setUploadProgress(100);

      setParsedPreview(result);
      setDatasetName(file.name.replace(/\.[^/.]+$/, ''));
      setDatasetDesc(`Dataset diekstrak dari dokumen ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

      if (result.sheets && result.sheets.length > 0) {
        setSelectedSheetName(result.sheets[0].name);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal memproses dan membaca file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToSystem = () => {
    if (!parsedPreview) return;

    let finalData = parsedPreview.data;
    if (parsedPreview.sheets && selectedSheetName) {
      const target = parsedPreview.sheets.find(s => s.name === selectedSheetName);
      if (target) finalData = target.data;
    }

    const newId = generateUniqueId('ds_upload');
    addDataset({
      id: newId,
      name: datasetName.trim() || parsedPreview.fileName,
      description: datasetDesc.trim() || 'Dataset kustom yang diunggah pengguna',
      fileName: parsedPreview.fileName,
      fileType: parsedPreview.fileType,
      fileSize: parsedPreview.fileSize,
      uploadedAt: new Date().toISOString(),
      data: finalData,
      sheets: parsedPreview.sheets,
      activeSheet: selectedSheetName || parsedPreview.sheets?.[0]?.name
    });

    selectDataset(newId);
    setCurrentView('explorer');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-cyan-400" />
          Modul Upload & Ekstraksi Multi-Format
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Unggah dokumen Excel (.xlsx, .xls), CSV, PDF, atau Word (.docx). Sistem secara otomatis mengekstrak struktur tabel, tipe data kolom, dan metadata analitik.
        </p>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/30'
            : 'border-slate-700/80 hover:border-cyan-500/50 bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf,.docx,.doc"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            {isProcessing ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-100">
              Drag & Drop file dokumen ke sini, atau <span className="text-cyan-400 hover:underline">Browse File</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Dukungan format: Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), Word (.docx, .doc) (Maks 50MB)
            </div>
          </div>

          {/* Supported Format Badges */}
          <div className="flex items-center gap-2 pt-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              EXCEL (.XLSX)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
              CSV
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              PDF
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              WORD (.DOCX)
            </span>
          </div>
        </div>
      </div>

      {/* Upload Progress Indicator */}
      {isProcessing && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Mengekstrak dan memvalidasi isi dokumen...</span>
            <span className="font-bold text-cyan-400">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Parsed Result & Configuration Preview */}
      {parsedPreview && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{parsedPreview.fileName}</div>
                <div className="text-xs text-slate-400">
                  Format: {parsedPreview.fileType.toUpperCase()} • Ukuran: {(parsedPreview.fileSize / 1024).toFixed(1)} KB • Total Baris:{' '}
                  {parsedPreview.data.length}
                </div>
              </div>
            </div>

            <button
              onClick={() => setParsedPreview(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Batalkan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Form Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nama Dataset di Dashboard:
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Deskripsi Singkat:
              </label>
              <input
                type="text"
                value={datasetDesc}
                onChange={(e) => setDatasetDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Multi-sheet Picker for Excel */}
          {parsedPreview.sheets && parsedPreview.sheets.length > 1 && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Terdeteksi Multi-Sheet Excel. Pilih Sheet yang akan Diimpor:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {parsedPreview.sheets.map(sheet => (
                  <button
                    key={sheet.name}
                    type="button"
                    onClick={() => setSelectedSheetName(sheet.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      selectedSheetName === sheet.name
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {sheet.name} ({sheet.data.length} baris)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Table Preview (First 5 rows) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Preview Data Ekstraksi (5 Baris Pertama):</span>
              <span className="text-[10px] text-slate-400">
                Kolom terdeteksi: {parsedPreview.data[0] ? Object.keys(parsedPreview.data[0]).length : 0}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-56">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold sticky top-0 border-b border-slate-800">
                  <tr>
                    {parsedPreview.data[0] &&
                      Object.keys(parsedPreview.data[0]).map(col => (
                        <th key={col} className="px-3 py-2.5 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono text-[11px]">
                  {parsedPreview.data.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/40">
                      {Object.keys(row).map((k, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                          {String(row[k] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save / Commit CTA */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setParsedPreview(null)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Batalkan
            </button>
            <button
              onClick={handleSaveToSystem}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <span>Simpan ke Database & Analisis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
