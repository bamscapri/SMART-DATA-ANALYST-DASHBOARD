import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { parseUploadedDocument, ParsedDocumentResult } from '../../utils/fileParser';
import { generateUniqueId } from '../../utils/idGenerator';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  Trash2,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';

export const UploadDataset: React.FC = () => {
  const { addDataset, setCurrentView, selectDataset } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedPreview, setParsedPreview] = useState<ParsedDocumentResult | null>(null);
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
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
    setSelectedFileObj(file);

    try {
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
      setSelectedFileObj(null);
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
    addDataset(
      {
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
      },
      selectedFileObj || undefined
    );

    selectDataset(newId);
    setCurrentView('explorer');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-[var(--color-primary)]" />
          <span>Modul Upload & Ekstraksi Multi-Format</span>
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Unggah dokumen Excel (.xlsx, .xls), CSV, PDF, atau Word (.docx). Sistem secara otomatis mengekstrak struktur tabel, tipe data kolom, dan metadata analitik.
        </p>
      </div>

      {/* Drag & Drop Area */}
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
          accept=".xlsx,.xls,.csv,.pdf,.docx,.doc"
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
              Drag & Drop file dokumen ke sini, atau{' '}
              <span className="text-[var(--color-primary)] underline">Browse File</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              Dukungan format: Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), Word (.docx, .doc) (Maks 50MB)
            </div>
          </div>

          {/* Supported Format Labels */}
          <div className="flex items-center gap-3 pt-2 text-[11px] font-semibold flex-wrap justify-center">
            <span
              className="px-2.5 py-1 rounded-md border border-[var(--border-color)]"
              style={{ backgroundColor: 'var(--bg-success-soft)', color: 'var(--color-success)' }}
            >
              EXCEL (.XLSX)
            </span>
            <span
              className="px-2.5 py-1 rounded-md border border-[var(--border-color)]"
              style={{ backgroundColor: 'var(--bg-primary-soft)', color: 'var(--color-primary)' }}
            >
              CSV
            </span>
            <span
              className="px-2.5 py-1 rounded-md border border-[var(--border-color)]"
              style={{ backgroundColor: 'var(--bg-danger-soft)', color: 'var(--color-danger)' }}
            >
              PDF
            </span>
            <span
              className="px-2.5 py-1 rounded-md border border-[var(--border-color)]"
              style={{ backgroundColor: 'var(--bg-warning-soft)', color: 'var(--color-warning)' }}
            >
              WORD (.DOCX)
            </span>
          </div>
        </div>
      </button>

      {/* Upload Progress Indicator */}
      {isProcessing && (
        <div className="p-4 rounded-xl surface-card space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-main)]">
            <span>Mengekstrak dan memvalidasi isi dokumen...</span>
            <span className="font-bold text-[var(--color-primary)] tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-[var(--bg-secondary)] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[var(--color-primary)] h-full transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          className="p-4 rounded-xl border text-xs flex items-center gap-3"
          style={{
            backgroundColor: 'var(--bg-danger-soft)',
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)'
          }}
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Parsed Result & Configuration Preview */}
      {parsedPreview && (
        <div className="p-6 rounded-2xl surface-card space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--bg-success-soft)', color: 'var(--color-success)' }}
              >
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-main)]">{parsedPreview.fileName}</div>
                <div className="text-xs text-[var(--text-secondary)] tabular-nums">
                  Format: {parsedPreview.fileType.toUpperCase()} · Ukuran: {(parsedPreview.fileSize / 1024).toFixed(1)} KB · Total Baris: {parsedPreview.data.length}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setParsedPreview(null)}
              aria-label="Batalkan Preview Upload"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--bg-secondary)] transition-theme cursor-pointer"
              title="Batalkan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

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
                Deskripsi Singkat
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

          {/* Multi-sheet Picker for Excel */}
          {parsedPreview.sheets && parsedPreview.sheets.length > 1 && (
            <div className="p-3.5 rounded-xl surface-secondary space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main)]">
                <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Terdeteksi Multi-Sheet Excel. Pilih Sheet yang akan Diimpor:</span>
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

          {/* Table Preview (First 5 rows) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--text-main)] flex items-center justify-between">
              <span>Preview Data Ekstraksi (5 Baris Pertama)</span>
              <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                Kolom terdeteksi: {parsedPreview.data[0] ? Object.keys(parsedPreview.data[0]).length : 0}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] max-h-56">
              <table className="w-full text-left text-xs text-[var(--text-main)]">
                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-[10px] font-bold sticky top-0 border-b border-[var(--border-color)]">
                  <tr>
                    {parsedPreview.data[0] &&
                      Object.keys(parsedPreview.data[0]).map(col => (
                        <th key={col} className="px-3 py-2.5 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-card)] font-mono text-[11px] tabular-nums">
                  {parsedPreview.data.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[var(--bg-caramel-soft)] transition-theme">
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
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setParsedPreview(null)}
              className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-medium border border-[var(--border-color)] transition-theme cursor-pointer"
            >
              Batalkan
            </button>
            <button
              type="button"
              onClick={handleSaveToSystem}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold text-xs shadow-xs transition-theme active:scale-95 cursor-pointer"
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
