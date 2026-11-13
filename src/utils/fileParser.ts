import {
  decodeBufferToText,
  parseCsvText,
  parseExcelArrayBuffer,
  parseDocxArrayBuffer,
  parsePdfArrayBuffer,
  parseJsonDatasetPayload,
} from './documentIntelligence';
import type { DocumentIntelligencePayload } from '../data/seedDatasets';

export interface ParsedDocumentResult {
  fileName: string;
  fileType: 'xlsx' | 'csv' | 'pdf' | 'docx' | 'json';
  fileSize: number;
  sheets?: { name: string; data: Record<string, any>[]; columns?: string[] }[];
  activeSheetName?: string;
  data: Record<string, any>[];
  rawText?: string;
  analysisMode?: 'structured' | 'document';
  documentContent?: DocumentIntelligencePayload;
  warnings?: string[];
}

/**
 * Parses CSV files with delimiter & encoding auto-detection
 */
export async function parseCsvFile(file: File): Promise<Record<string, any>[]> {
  const buf = await file.arrayBuffer();
  const text = decodeBufferToText(buf);
  return parseCsvText(text);
}

/**
 * Parses Excel files (.xlsx, .xls) extracting all sheets & formula metadata
 */
export async function parseExcelFile(file: File): Promise<{
  sheets: { name: string; data: Record<string, any>[]; columns?: string[] }[];
  activeSheetName: string;
  primaryData: Record<string, any>[];
  formulasDetected: number;
  formulaExamples: string[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  return parseExcelArrayBuffer(arrayBuffer);
}

/**
 * Parses Word (.docx) documents, extracting HTML tables, headings, and text sections
 */
export async function parseDocxFile(file: File): Promise<{
  data: Record<string, any>[];
  rawText: string;
  analysisMode: 'structured' | 'document';
  documentContent: DocumentIntelligencePayload;
}> {
  const arrayBuffer = await file.arrayBuffer();
  return parseDocxArrayBuffer(arrayBuffer, file.name);
}

/**
 * Unified file parser covering Excel, CSV, PDF, DOCX, and JSON
 */
export async function parseUploadedDocument(file: File): Promise<ParsedDocumentResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'csv') {
    const data = await parseCsvFile(file);
    return {
      fileName: file.name,
      fileType: 'csv',
      fileSize: file.size,
      data,
      analysisMode: 'structured',
    };
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const { sheets, activeSheetName, primaryData, formulasDetected, formulaExamples } =
      await parseExcelFile(file);
    const warnings: string[] = [];
    if (formulasDetected > 0) {
      warnings.push(
        `Terdeteksi ${formulasDetected} sel formula Excel (contoh: ${formulaExamples.slice(0, 2).join(', ')}); nilai terhitung telah diekstrak.`
      );
    }
    return {
      fileName: file.name,
      fileType: 'xlsx',
      fileSize: file.size,
      sheets,
      activeSheetName,
      data: primaryData,
      analysisMode: 'structured',
      warnings,
      documentContent: {
        isDocumentDominant: false,
        pageCount: sheets.length,
        wordCount: 0,
        paragraphCount: 0,
        headingCount: sheets.length,
        tableCount: sheets.length,
        formulasDetected,
        formulaExamples,
        headings: sheets.map(s => s.name),
        sections: [],
        extractedTables: sheets.map((s, i) => ({
          id: `xlsx-sheet-${i + 1}`,
          title: s.name,
          sheetName: s.name,
          rowCount: s.data.length,
          colCount: s.columns?.length || 0,
          columns: s.columns || [],
          rows: s.data,
        })),
        rawTextPreview: '',
      },
    };
  }

  if (extension === 'docx' || extension === 'doc') {
    const { data, rawText, analysisMode, documentContent } = await parseDocxFile(file);
    return {
      fileName: file.name,
      fileType: 'docx',
      fileSize: file.size,
      data,
      rawText,
      analysisMode,
      documentContent,
      sheets:
        documentContent.extractedTables.length > 0
          ? documentContent.extractedTables.map(t => ({
              name: t.title.slice(0, 40),
              data: t.rows,
              columns: t.columns,
            }))
          : undefined,
      activeSheetName: documentContent.extractedTables[0]?.title.slice(0, 40),
    };
  }

  if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const { data, rawText, analysisMode, documentContent } = await parsePdfArrayBuffer(
      arrayBuffer,
      file.name
    );
    const warnings: string[] = [];
    if (documentContent.isScannedPdf && !documentContent.ocrApplied) {
      warnings.push(
        'PDF terdeteksi berbasis gambar/scan dan OCR AI tidak tersedia/offline; hanya metadata dan teks parsial yang diekstrak.'
      );
    }
    return {
      fileName: file.name,
      fileType: 'pdf',
      fileSize: file.size,
      data,
      rawText,
      analysisMode,
      documentContent,
      warnings,
      sheets:
        documentContent.extractedTables.length > 0
          ? documentContent.extractedTables.map(t => ({
              name: t.title.slice(0, 40),
              data: t.rows,
              columns: t.columns,
            }))
          : undefined,
      activeSheetName: documentContent.extractedTables[0]?.title.slice(0, 40),
    };
  }

  if (extension === 'json') {
    const text = await file.text();
    const parsedJson = JSON.parse(text);
    const data = parseJsonDatasetPayload(parsedJson);
    return {
      fileName: file.name,
      fileType: 'json',
      fileSize: file.size,
      data,
      analysisMode: 'structured',
    };
  }

  throw new Error(
    `Format file .${extension} belum didukung. Silakan gunakan .xlsx, .xls, .csv, .pdf, .docx, atau .json.`
  );
}

/**
 * Parse binary base64 payload returned from /api/ingest/url into ParsedDocumentResult
 */
export async function parseRemoteIngestPayload(payload: {
  fileName: string;
  format: 'csv' | 'xlsx' | 'pdf' | 'docx' | 'json';
  byteLength: number;
  base64Content: string;
  mimeType?: string;
}): Promise<ParsedDocumentResult> {
  const binaryStr = atob(payload.base64Content);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const arrayBuffer = bytes.buffer;

  if (payload.format === 'csv') {
    const text = decodeBufferToText(arrayBuffer);
    return {
      fileName: payload.fileName,
      fileType: 'csv',
      fileSize: payload.byteLength,
      data: parseCsvText(text),
      analysisMode: 'structured',
    };
  }

  if (payload.format === 'xlsx') {
    const { sheets, activeSheetName, primaryData, formulasDetected, formulaExamples } =
      parseExcelArrayBuffer(arrayBuffer);
    return {
      fileName: payload.fileName,
      fileType: 'xlsx',
      fileSize: payload.byteLength,
      sheets,
      activeSheetName,
      data: primaryData,
      analysisMode: 'structured',
      warnings:
        formulasDetected > 0
          ? [`Terdeteksi ${formulasDetected} sel formula (${formulaExamples.slice(0, 2).join(', ')}).`]
          : undefined,
    };
  }

  if (payload.format === 'docx') {
    const res = await parseDocxArrayBuffer(arrayBuffer, payload.fileName);
    return {
      fileName: payload.fileName,
      fileType: 'docx',
      fileSize: payload.byteLength,
      ...res,
    };
  }

  if (payload.format === 'pdf') {
    const res = await parsePdfArrayBuffer(arrayBuffer, payload.fileName);
    return {
      fileName: payload.fileName,
      fileType: 'pdf',
      fileSize: payload.byteLength,
      ...res,
    };
  }

  const text = decodeBufferToText(arrayBuffer);
  const parsedJson = JSON.parse(text);
  return {
    fileName: payload.fileName,
    fileType: 'json',
    fileSize: payload.byteLength,
    data: parseJsonDatasetPayload(parsedJson),
    analysisMode: 'structured',
  };
}

/**
 * Combine multiple parsed datasets vertically (union schema + _source_file provenance column)
 */
export function combineParsedDatasets(
  results: ParsedDocumentResult[]
): { data: Record<string, any>[]; warnings: string[] } {
  const warnings: string[] = [];
  if (results.length === 0) return { data: [], warnings };
  if (results.length === 1) {
    return {
      data: results[0].data.map(r => ({ ...r, _source_file: results[0].fileName })),
      warnings,
    };
  }

  const allCols = new Set<string>();
  results.forEach(res => {
    if (res.data[0]) Object.keys(res.data[0]).forEach(k => allCols.add(k));
  });

  const combined: Record<string, any>[] = [];
  for (const res of results) {
    for (const row of res.data) {
      const normalized: Record<string, any> = {};
      allCols.forEach(col => {
        normalized[col] = row[col] !== undefined ? row[col] : null;
      });
      normalized['_source_file'] = res.fileName;
      combined.push(normalized);
    }
  }

  const firstCols = new Set(results[0].data[0] ? Object.keys(results[0].data[0]) : []);
  const schemaDiff = [...allCols].some(c => !firstCols.has(c));
  if (schemaDiff) {
    warnings.push(
      'Beberapa file memiliki perbedaan kolom; sistem menggabungkan skema (union) dengan nilai null untuk kolom yang tidak ada.'
    );
  }

  return { data: combined, warnings };
}
