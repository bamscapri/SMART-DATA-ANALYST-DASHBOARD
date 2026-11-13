import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import type {
  DocumentIntelligencePayload,
  DocumentSectionExtracted,
  DocumentTableExtracted,
} from '../data/seedDatasets';

export interface PdfTextToken {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL?: boolean;
}

/**
 * Coerce numeric strings cleanly (handles thousand separators, percentages, currency)
 * while leaving dates, IDs, or real text intact.
 */
export function coerceCellValue(raw: any): any {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw.toISOString().slice(0, 10);
  }
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'boolean') return raw;

  const trimmed = String(raw).replace(/\u00a0/g, ' ').trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'n/a') {
    return trimmed === '' ? null : trimmed;
  }

  // Keep ISO dates or slash dates as strings
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(trimmed)) {
    return trimmed;
  }

  // Keep leading-zero IDs like "00123" or SKU/order IDs intact
  if (/^0\d+$/.test(trimmed)) {
    return trimmed;
  }

  // Strip currency symbols (Rp, IDR, $, €, £) and check numeric
  const currencyCleaned = trimmed
    .replace(/^(rp\.?|idr|\$|€|£)\s*/i, '')
    .replace(/%$/, '')
    .trim();

  // US/Standard comma thousands: 1,250,000 or 1,250.50
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(currencyCleaned)) {
    const num = Number(currencyCleaned.replace(/,/g, ''));
    return Number.isFinite(num) ? num : trimmed;
  }

  // Indonesian dot thousands with optional comma decimal: 1.250.000 or 1.250.000,50
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(currencyCleaned)) {
    const num = Number(currencyCleaned.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(num) ? num : trimmed;
  }

  // Simple numeric with optional decimal dot
  if (/^-?\d+(\.\d+)?$/.test(currencyCleaned)) {
    const num = Number(currencyCleaned);
    return Number.isFinite(num) ? num : trimmed;
  }

  return trimmed;
}

/**
 * Decode binary buffer with UTF-8 BOM handling and Latin-1 fallback for CSV text
 */
export function decodeBufferToText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Strip UTF-8 BOM if present
  let offset = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    offset = 3;
  }
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(offset));
  // If replacement char appears frequently, try windows-1252 / latin1
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
  if (replacementCount > 3) {
    try {
      return new TextDecoder('windows-1252').decode(bytes);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

/**
 * Detect most likely CSV delimiter (comma, semicolon, tab, pipe)
 */
export function detectCsvDelimiter(sampleText: string): string {
  const firstLines = sampleText.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 8);
  if (firstLines.length === 0) return ',';
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = firstLines.map(line => {
      let inQuotes = false;
      let cnt = 0;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes;
        else if (!inQuotes && line[i] === delim) cnt++;
      }
      return cnt;
    });
    const avg = counts.reduce((s, c) => s + c, 0) / counts.length;
    if (avg >= 1) {
      const variance = counts.reduce((s, c) => s + Math.pow(c - avg, 2), 0) / counts.length;
      const score = avg * 10 - variance;
      if (score > bestScore) {
        bestScore = score;
        best = delim;
      }
    }
  }
  return best;
}

export function parseCsvText(csvText: string): Record<string, any>[] {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];
  const delimiter = detectCsvDelimiter(cleanText);
  const parsed = Papa.parse<Record<string, any>>(cleanText, {
    header: true,
    delimiter,
    skipEmptyLines: 'greedy',
    transformHeader: (h: string) => h.trim() || 'Column',
  });

  if (!Array.isArray(parsed.data)) return [];
  return parsed.data
    .filter(row => row && Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== ''))
    .map(row => {
      const normalized: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        normalized[k] = coerceCellValue(v);
      }
      return normalized;
    });
}

/**
 * Deduplicate/normalize header names
 */
function normalizeHeaders(rawHeaders: string[]): string[] {
  const seen: Record<string, number> = {};
  return rawHeaders.map((h, idx) => {
    const base = String(h || '').replace(/\s+/g, ' ').trim() || `Col_${idx + 1}`;
    if (!seen[base]) {
      seen[base] = 1;
      return base;
    }
    seen[base] += 1;
    return `${base}_${seen[base]}`;
  });
}

/**
 * Strip HTML tags safely & decode common HTML entities
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(?:p|div|li|tr|h[1-6])[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract structured headings, paragraphs, sections, and HTML tables from Mammoth HTML output
 */
export function extractWordHtmlStructure(
  html: string,
  fileName: string
): {
  headings: string[];
  sections: DocumentSectionExtracted[];
  extractedTables: DocumentTableExtracted[];
  paragraphs: string[];
  primaryRows: Record<string, any>[];
} {
  const headings: string[] = [];
  const paragraphs: string[] = [];
  const sections: DocumentSectionExtracted[] = [];
  const extractedTables: DocumentTableExtracted[] = [];

  // Match headings, paragraphs, list items, and tables in document order
  const blockRegex = /<(h[1-6]|p|li|table)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let currentHeading = fileName.replace(/\.[^/.]+$/, '');
  let currentLevel = 1;
  let currentBuffer: string[] = [];
  let tableCounter = 0;

  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag.startsWith('h')) {
      if (currentBuffer.length > 0) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          content: currentBuffer.join('\n'),
        });
        currentBuffer = [];
      }
      const text = stripHtmlTags(inner);
      if (text) {
        headings.push(text);
        currentHeading = text;
        currentLevel = Number(tag.slice(1)) || 1;
      }
    } else if (tag === 'p' || tag === 'li') {
      const text = stripHtmlTags(inner);
      if (text) {
        paragraphs.push(text);
        currentBuffer.push(text);
      }
    } else if (tag === 'table') {
      const rowMatches = inner.match(/<tr(?:\s[^>]*)?>[\s\S]*?<\/tr>/gi) || [];
      const matrix: string[][] = [];
      for (const rowHtml of rowMatches) {
        const cellMatches = rowHtml.match(/<(?:th|td)(?:\s[^>]*)?>[\s\S]*?<\/(?:th|td)>/gi) || [];
        const cells = cellMatches.map(c => stripHtmlTags(c));
        if (cells.some(c => c !== '')) {
          matrix.push(cells);
        }
      }

      if (matrix.length >= 2 && matrix[0].length >= 2) {
        tableCounter++;
        const headers = normalizeHeaders(matrix[0]);
        const rows: Record<string, any>[] = [];
        for (let r = 1; r < matrix.length; r++) {
          const obj: Record<string, any> = {};
          headers.forEach((h, cIdx) => {
            obj[h] = coerceCellValue(matrix[r][cIdx] ?? null);
          });
          rows.push(obj);
        }
        extractedTables.push({
          id: `docx-tbl-${tableCounter}`,
          title: currentHeading ? `${currentHeading} (Tabel ${tableCounter})` : `Tabel ${tableCounter}`,
          rowCount: rows.length,
          colCount: headers.length,
          columns: headers,
          rows,
        });
      }
    }
  }

  if (currentBuffer.length > 0) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      content: currentBuffer.join('\n'),
    });
  }

  // Pick largest extracted table as primary structured rows; fallback to document sections summary
  let primaryRows: Record<string, any>[] = [];
  if (extractedTables.length > 0) {
    const largest = [...extractedTables].sort(
      (a, b) => b.rowCount * b.colCount - a.rowCount * a.colCount
    )[0];
    primaryRows = largest.rows.map(r => ({ ...r }));
  } else if (sections.length > 0) {
    primaryRows = sections.map((sec, idx) => ({
      Section_No: idx + 1,
      Heading: sec.heading,
      Word_Count: sec.content.split(/\s+/).filter(Boolean).length,
      Content_Summary: sec.content.slice(0, 260),
    }));
  } else {
    primaryRows = paragraphs.slice(0, 200).map((p, idx) => ({
      Paragraph_No: idx + 1,
      Word_Count: p.split(/\s+/).filter(Boolean).length,
      Content: p,
    }));
  }

  return { headings, sections, extractedTables, paragraphs, primaryRows };
}

/**
 * Reconstruct tabular data from PDF positioned text tokens (x, y coordinates) on a single page.
 */
export function reconstructPdfTableFromItems(
  tokens: PdfTextToken[],
  pageNumber: number
): {
  lines: string[];
  tables: DocumentTableExtracted[];
  headings: string[];
} {
  const cleanTokens = tokens
    .map(t => ({
      ...t,
      str: t.str.replace(/\s+/g, ' ').trim(),
    }))
    .filter(t => t.str.length > 0);

  if (cleanTokens.length === 0) {
    return { lines: [], tables: [], headings: [] };
  }

  // Group into horizontal lines (Y descending in PDF coordinate space)
  const yTolerance = 4.5;
  const sortedByY = [...cleanTokens].sort((a, b) => b.y - a.y || a.x - b.x);
  const yGroups: { y: number; tokens: PdfTextToken[] }[] = [];

  for (const token of sortedByY) {
    const existing = yGroups.find(g => Math.abs(g.y - token.y) <= yTolerance);
    if (existing) {
      existing.tokens.push(token);
    } else {
      yGroups.push({ y: token.y, tokens: [token] });
    }
  }

  for (const g of yGroups) {
    g.tokens.sort((a, b) => a.x - b.x);
  }

  // Split each Y-line into column cells whenever horizontal gap between adjacent tokens >= 14px
  const lineRows = yGroups.map(g => {
    const cells: { text: string; x: number }[] = [];
    for (const tok of g.tokens) {
      const prev = cells[cells.length - 1];
      if (!prev) {
        cells.push({ text: tok.str, x: tok.x });
      } else {
        // Estimate previous token right edge using last token width
        const gap = tok.x - prev.x;
        const avgTextWidth = Math.max(prev.text.length * 4.5, 12);
        if (gap - avgTextWidth >= 14) {
          cells.push({ text: tok.str, x: tok.x });
        } else {
          prev.text = `${prev.text} ${tok.str}`.trim();
        }
      }
    }
    return {
      y: g.y,
      cells,
      fullLine: cells.map(c => c.text).join('  '),
    };
  });

  const lines = lineRows.map(r => r.fullLine).filter(Boolean);
  const avgHeight =
    cleanTokens.reduce((s, t) => s + (t.height || 10), 0) / Math.max(cleanTokens.length, 1);

  const headings: string[] = [];
  for (const g of yGroups) {
    const rowHeight = Math.max(...g.tokens.map(t => t.height || 10));
    const lineText = g.tokens.map(t => t.str).join(' ').trim();
    if (
      lineText.length >= 4 &&
      lineText.length <= 90 &&
      (rowHeight >= avgHeight * 1.25 || /^[0-9]+(\.[0-9]+)?\s+[A-Z]/.test(lineText))
    ) {
      headings.push(lineText);
    }
  }

  // Identify contiguous multi-column blocks (>= 3 rows, >= 2 columns aligned)
  const tables: DocumentTableExtracted[] = [];
  let blockStart = -1;
  let blockRows: typeof lineRows = [];

  const flushBlock = () => {
    if (blockRows.length >= 3) {
      // Cluster X positions across block rows to derive aligned column anchors
      const allXs = blockRows.flatMap(r => r.cells.map(c => c.x)).sort((a, b) => a - b);
      const anchors: number[] = [];
      for (const x of allXs) {
        const last = anchors[anchors.length - 1];
        if (last === undefined || x - last > 28) {
          anchors.push(x);
        }
      }

      if (anchors.length >= 2 && anchors.length <= 16) {
        const headerRow = blockRows[0];
        const rawHeaders = anchors.map((ax, idx) => {
          const cell = headerRow.cells.find(
            c =>
              anchors.reduce((bestIdx, cand, cIdx) =>
                Math.abs(c.x - cand) < Math.abs(c.x - anchors[bestIdx]) ? cIdx : bestIdx
              , 0) === idx
          );
          return cell?.text || `Col_${idx + 1}`;
        });
        const headers = normalizeHeaders(rawHeaders);

        const dataRows: Record<string, any>[] = [];
        for (let i = 1; i < blockRows.length; i++) {
          const obj: Record<string, any> = {};
          headers.forEach(h => {
            obj[h] = null;
          });
          for (const cell of blockRows[i].cells) {
            let bestAnchorIdx = 0;
            let bestDist = Infinity;
            anchors.forEach((a, idx) => {
              const d = Math.abs(cell.x - a);
              if (d < bestDist) {
                bestDist = d;
                bestAnchorIdx = idx;
              }
            });
            const colName = headers[bestAnchorIdx];
            const prevVal = obj[colName];
            const combined = prevVal ? `${prevVal} ${cell.text}` : cell.text;
            obj[colName] = coerceCellValue(combined);
          }
          obj['_source_page'] = pageNumber;
          if (Object.entries(obj).some(([k, v]) => k !== '_source_page' && v !== null && v !== '')) {
            dataRows.push(obj);
          }
        }

        if (dataRows.length >= 2) {
          tables.push({
            id: `pdf-p${pageNumber}-t${tables.length + 1}`,
            title: `Tabel Halaman ${pageNumber} (#${tables.length + 1})`,
            pageNumber,
            rowCount: dataRows.length,
            colCount: headers.length + 1,
            columns: [...headers, '_source_page'],
            rows: dataRows,
          });
        }
      }
    }
    blockStart = -1;
    blockRows = [];
  };

  lineRows.forEach((row, idx) => {
    if (row.cells.length >= 2) {
      if (blockStart === -1) blockStart = idx;
      blockRows.push(row);
    } else {
      flushBlock();
    }
  });
  flushBlock();

  return { lines, tables, headings };
}

/**
 * Determine whether extracted content is primarily Structured Tabular Data or Narrative Document Intelligence
 */
export function classifyAnalysisMode(params: {
  fileType: 'csv' | 'xlsx' | 'pdf' | 'docx' | 'json';
  rows: Record<string, any>[];
  wordCount: number;
  extractedTables: DocumentTableExtracted[];
}): 'structured' | 'document' {
  const { fileType, rows, wordCount, extractedTables } = params;
  if (fileType === 'csv' || fileType === 'xlsx' || fileType === 'json') {
    return 'structured';
  }
  // PDF or DOCX with genuine multi-column structured tables >= 3 rows and >= 2 data columns
  const substantialTable = extractedTables.find(
    t => t.rowCount >= 3 && t.columns.filter(c => !c.startsWith('_source_')).length >= 2
  );
  if (substantialTable && substantialTable.rowCount >= 4) {
    return 'structured';
  }
  // If fallback line-indexed rows (Page/Content or Section_No/Content_Summary) & rich narrative text -> document mode
  if (wordCount >= 30 || rows.length <= 2) {
    return 'document';
  }
  return rows.length >= 3 && Object.keys(rows[0] || {}).length >= 3 ? 'structured' : 'document';
}

/**
 * Flatten JSON array or API envelope ({ data: [...], results: [...], items: [...] }) into tabular rows
 */
export function parseJsonDatasetPayload(jsonInput: unknown): Record<string, any>[] {
  let targetArray: any[] | null = null;
  if (Array.isArray(jsonInput)) {
    targetArray = jsonInput;
  } else if (jsonInput && typeof jsonInput === 'object') {
    const obj = jsonInput as Record<string, any>;
    for (const key of ['data', 'rows', 'records', 'items', 'results', 'values', 'entries']) {
      if (Array.isArray(obj[key])) {
        targetArray = obj[key];
        break;
      }
    }
    if (!targetArray) {
      const firstArrVal = Object.values(obj).find(v => Array.isArray(v) && v.length > 0);
      if (Array.isArray(firstArrVal)) targetArray = firstArrVal;
      else targetArray = [obj];
    }
  }

  if (!targetArray || targetArray.length === 0) return [];

  return targetArray.map((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { Index: idx + 1, Value: coerceCellValue(item) };
    }
    const flat: Record<string, any> = {};
    for (const [k, v] of Object.entries(item)) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        for (const [subK, subV] of Object.entries(v)) {
          flat[`${k}_${subK}`] = Array.isArray(subV) || (subV && typeof subV === 'object') ? JSON.stringify(subV) : coerceCellValue(subV);
        }
      } else if (Array.isArray(v)) {
        flat[k] = v.join(', ');
      } else {
        flat[k] = coerceCellValue(v);
      }
    }
    return flat;
  });
}

/**
 * Parse Excel ArrayBuffer including multi-sheet data, formula counting, and empty trim
 */
export function parseExcelArrayBuffer(arrayBuffer: ArrayBuffer): {
  sheets: { name: string; data: Record<string, any>[]; columns: string[] }[];
  activeSheetName: string;
  primaryData: Record<string, any>[];
  formulasDetected: number;
  formulaExamples: string[];
} {
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellFormula: true,
  });

  const sheets: { name: string; data: Record<string, any>[]; columns: string[] }[] = [];
  let formulasDetected = 0;
  const formulaExamples: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Inspect formulas
    for (const cellAddr of Object.keys(sheet)) {
      if (cellAddr.startsWith('!')) continue;
      const cell = sheet[cellAddr];
      if (cell && cell.f) {
        formulasDetected++;
        if (formulaExamples.length < 8) {
          formulaExamples.push(`${sheetName}!${cellAddr}: =${cell.f}`);
        }
      }
    }

    const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: null,
      raw: true,
    });

    const cleanedRows = rawJson
      .filter(r => Object.values(r).some(v => v !== null && v !== undefined && String(v).trim() !== ''))
      .map(r => {
        const obj: Record<string, any> = {};
        for (const [k, v] of Object.entries(r)) {
          const cleanKey = k.trim();
          if (cleanKey.startsWith('__EMPTY') && (v === null || v === undefined || v === '')) continue;
          obj[cleanKey] = coerceCellValue(v);
        }
        return obj;
      });

    const cols = cleanedRows[0] ? Object.keys(cleanedRows[0]) : [];
    sheets.push({
      name: sheetName,
      data: cleanedRows,
      columns: cols,
    });
  }

  const nonEmptySheet = sheets.find(s => s.data.length > 0) || sheets[0];
  return {
    sheets,
    activeSheetName: nonEmptySheet?.name || 'Sheet1',
    primaryData: nonEmptySheet?.data || [],
    formulasDetected,
    formulaExamples,
  };
}

/**
 * Parse DOCX ArrayBuffer extracting headings, sections, paragraphs, HTML tables, and document summary
 */
export async function parseDocxArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName: string
): Promise<{
  data: Record<string, any>[];
  rawText: string;
  analysisMode: 'structured' | 'document';
  documentContent: DocumentIntelligencePayload;
}> {
  const [htmlRes, rawRes] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer }),
    mammoth.extractRawText({ arrayBuffer }),
  ]);

  const rawText = rawRes.value || '';
  const { headings, sections, extractedTables, paragraphs, primaryRows } = extractWordHtmlStructure(
    htmlRes.value || '',
    fileName
  );

  // Also check tab-separated structured lines if HTML had no <table>
  let finalData = primaryRows;
  if (extractedTables.length === 0) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 2 && lines[0].includes('\t')) {
      const headers = normalizeHeaders(lines[0].split('\t'));
      const tabRows: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          obj[h] = coerceCellValue(parts[idx] ?? null);
        });
        tabRows.push(obj);
      }
      if (tabRows.length > 0) {
        finalData = tabRows;
        extractedTables.push({
          id: 'docx-tab-1',
          title: 'Tabel Terstruktur (Tab-Separated)',
          rowCount: tabRows.length,
          colCount: headers.length,
          columns: headers,
          rows: tabRows,
        });
      }
    }
  }

  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const analysisMode = classifyAnalysisMode({
    fileType: 'docx',
    rows: finalData,
    wordCount,
    extractedTables,
  });

  const documentContent: DocumentIntelligencePayload = {
    isDocumentDominant: analysisMode === 'document',
    pageCount: Math.max(1, Math.ceil(wordCount / 380)),
    wordCount,
    paragraphCount: paragraphs.length,
    headingCount: headings.length,
    tableCount: extractedTables.length,
    headings,
    sections,
    extractedTables,
    rawTextPreview: rawText.slice(0, 1200),
    fullText: rawText.slice(0, 40000),
  };

  return {
    data: finalData.length > 0 ? finalData : [{ Document: fileName, Word_Count: wordCount, Excerpt: rawText.slice(0, 300) }],
    rawText,
    analysisMode,
    documentContent,
  };
}

/**
 * Parse PDF ArrayBuffer using pdfjs-dist with coordinate table reconstruction + scanned PDF OCR detection.
 */
export async function parsePdfArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  options?: { enableOcrFallback?: boolean }
): Promise<{
  data: Record<string, any>[];
  rawText: string;
  analysisMode: 'structured' | 'document';
  documentContent: DocumentIntelligencePayload;
}> {
  const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    } catch {
      // worker fallback handled below
    }
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableWorker: typeof window === 'undefined',
    verbosity: 0,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages || 0;

  const allHeadings: string[] = [];
  const allSections: DocumentSectionExtracted[] = [];
  const allTables: DocumentTableExtracted[] = [];
  const pageTexts: string[] = [];
  let lowTextPages = 0;
  const scannedPageImages: { pageNumber: number; base64Png: string }[] = [];

  for (let p = 1; p <= numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const tokens: PdfTextToken[] = (textContent.items || [])
      .filter((item: any) => typeof item.str === 'string')
      .map((item: any) => ({
        str: item.str,
        x: Array.isArray(item.transform) ? Number(item.transform[4]) || 0 : 0,
        y: Array.isArray(item.transform) ? Number(item.transform[5]) || 0 : 0,
        width: Number(item.width) || 0,
        height: Number(item.height) || 10,
        hasEOL: Boolean(item.hasEOL),
      }));

    const { lines, tables, headings } = reconstructPdfTableFromItems(tokens, p);
    const pageText = lines.join('\n').trim();

    if (pageText.length < 35) {
      lowTextPages++;
      // In browser environment, render scanned page to canvas for optional Gemini Vision OCR
      if (
        options?.enableOcrFallback !== false &&
        typeof document !== 'undefined' &&
        scannedPageImages.length < 3
      ) {
        try {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(viewport.width, 1400);
          canvas.height = Math.min(viewport.height, 1800);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/png');
            const base64 = dataUrl.split(',')[1];
            if (base64) {
              scannedPageImages.push({ pageNumber: p, base64Png: base64 });
            }
          }
        } catch {
          // ignore canvas render failures
        }
      }
    }

    pageTexts.push(pageText);
    allHeadings.push(...headings);
    allTables.push(...tables);
    if (pageText) {
      allSections.push({
        heading: headings[0] || `Halaman ${p}`,
        level: 2,
        pageNumber: p,
        content: pageText,
      });
    }
  }

  let ocrApplied = false;
  const isScannedPdf = numPages > 0 && lowTextPages >= Math.ceil(numPages * 0.6);

  // If scanned PDF detected in browser, attempt OCR via backend Gemini Vision endpoint
  if (isScannedPdf && scannedPageImages.length > 0 && typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/ai/ocr-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          pages: scannedPageImages,
        }),
      });
      if (res.ok) {
        const ocrJson = await res.json();
        if (ocrJson.text) {
          ocrApplied = true;
          pageTexts.push(`\n--- OCR EXTRACTED ---\n${ocrJson.text}`);
          allSections.push({
            heading: 'Hasil OCR Dokumen Scan',
            level: 1,
            pageNumber: 1,
            content: ocrJson.text,
          });
        }
        if (Array.isArray(ocrJson.tables)) {
          for (const tbl of ocrJson.tables) {
            if (Array.isArray(tbl.rows) && tbl.rows.length > 0) {
              allTables.push({
                id: `pdf-ocr-t${allTables.length + 1}`,
                title: tbl.title || `Tabel OCR Halaman ${tbl.pageNumber || 1}`,
                pageNumber: tbl.pageNumber || 1,
                rowCount: tbl.rows.length,
                colCount: Object.keys(tbl.rows[0]).length,
                columns: Object.keys(tbl.rows[0]),
                rows: tbl.rows,
              });
            }
          }
        }
      }
    } catch {
      // OCR gracefully optional when backend unreachable
    }
  }

  const combinedText = pageTexts.filter(Boolean).join('\n\n');
  const wordCount = combinedText.split(/\s+/).filter(Boolean).length;
  const paragraphCount = combinedText.split(/\n{2,}/).filter(Boolean).length;

  let finalData: Record<string, any>[] = [];
  if (allTables.length > 0) {
    // Combine tables if schemas share >= 50% columns, else take the richest table
    const largest = [...allTables].sort((a, b) => b.rowCount * b.colCount - a.rowCount * a.colCount)[0];
    finalData = largest.rows;
  } else if (allSections.length > 0) {
    finalData = allSections.map(s => ({
      Page: s.pageNumber || 1,
      Section: s.heading,
      Word_Count: s.content.split(/\s+/).filter(Boolean).length,
      Content_Excerpt: s.content.slice(0, 260),
    }));
  } else {
    finalData = [
      {
        Page: 1,
        Document: fileName,
        Status: isScannedPdf ? 'Scanned PDF (OCR Required)' : 'Empty/Image PDF',
        Word_Count: wordCount,
      },
    ];
  }

  const analysisMode = classifyAnalysisMode({
    fileType: 'pdf',
    rows: finalData,
    wordCount,
    extractedTables: allTables,
  });

  const documentContent: DocumentIntelligencePayload = {
    isDocumentDominant: analysisMode === 'document',
    pageCount: numPages,
    wordCount,
    paragraphCount,
    headingCount: allHeadings.length,
    tableCount: allTables.length,
    isScannedPdf,
    ocrApplied,
    headings: allHeadings.slice(0, 40),
    sections: allSections,
    extractedTables: allTables,
    rawTextPreview: combinedText.slice(0, 1200),
    fullText: combinedText.slice(0, 40000),
  };

  return {
    data: finalData,
    rawText: combinedText,
    analysisMode,
    documentContent,
  };
}
