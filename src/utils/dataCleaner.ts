import { computeNumericStats } from './analytics';

export type MissingAction =
  | 'drop_row'
  | 'fill_mean'
  | 'fill_median'
  | 'fill_mode'
  | 'fill_ffill'
  | 'fill_bfill'
  | 'fill_custom';

export type OutlierAction = 'keep' | 'drop_row' | 'cap_bounds';
export type OutlierMethod = 'iqr' | 'zscore' | 'percentile';
export type TextNormalizeMode = 'none' | 'trim' | 'lowercase' | 'uppercase' | 'titlecase';

export interface CleaningRule {
  column: string;
  missingAction?: MissingAction;
  customFillValue?: string | number;
  outlierAction?: OutlierAction;
  outlierMethod?: OutlierMethod;
  convertType?: 'numeric' | 'date' | 'boolean' | 'text';
  trimWhitespace?: boolean;
  textNormalizeMode?: TextNormalizeMode;
  normalizeDateIso?: boolean;
  categoryMapping?: Record<string, string>;
}

export interface ColumnDiffSummary {
  column: string;
  missingBefore: number;
  missingAfter: number;
  uniqueBefore: number;
  uniqueAfter: number;
  outliersAdjusted: number;
}

export interface CleaningReport {
  originalRowCount: number;
  newRowCount: number;
  duplicatesRemoved: number;
  missingValuesHandled: number;
  outliersAdjusted: number;
  typeConversions: number;
  datesNormalized: number;
  categoriesStandardized: number;
  appliedRules: string[];
  columnDiffs: ColumnDiffSummary[];
}

function isEmptyCell(val: any): boolean {
  return val === null || val === undefined || (typeof val === 'string' && val.trim() === '');
}

function computeModeValue(values: any[]): any {
  const counts = new Map<string, { val: any; count: number }>();
  for (const v of values) {
    if (isEmptyCell(v)) continue;
    const key = String(v);
    const cur = counts.get(key);
    if (cur) cur.count++;
    else counts.set(key, { val: v, count: 1 });
  }
  let bestVal: any = null;
  let bestCnt = 0;
  for (const item of counts.values()) {
    if (item.count > bestCnt) {
      bestCnt = item.count;
      bestVal = item.val;
    }
  }
  return bestVal;
}

function toIsoDate(val: any): string | null {
  if (isEmptyCell(val)) return null;
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  // Handle DD/MM/YYYY or DD-MM-YYYY explicitly
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const day = Number(d);
    const month = Number(m);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return s;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function cleanDataset(
  data: Record<string, any>[],
  rules: CleaningRule[],
  removeDuplicates: boolean = true
): { cleanedData: Record<string, any>[]; report: CleaningReport } {
  if (!data || data.length === 0) {
    return {
      cleanedData: [],
      report: {
        originalRowCount: 0,
        newRowCount: 0,
        duplicatesRemoved: 0,
        missingValuesHandled: 0,
        outliersAdjusted: 0,
        typeConversions: 0,
        datesNormalized: 0,
        categoriesStandardized: 0,
        appliedRules: [],
        columnDiffs: [],
      },
    };
  }

  let current = data.map(row => ({ ...row }));
  const appliedRules: string[] = [];
  let duplicatesRemoved = 0;
  let missingValuesHandled = 0;
  let outliersAdjusted = 0;
  let typeConversions = 0;
  let datesNormalized = 0;
  let categoriesStandardized = 0;

  // Snapshot before metrics per ruled column
  const beforeSnapshots = new Map<string, { missing: number; unique: number }>();
  for (const rule of rules) {
    const col = rule.column;
    if (!beforeSnapshots.has(col)) {
      const vals = data.map(r => r[col]);
      const missing = vals.filter(isEmptyCell).length;
      const unique = new Set(vals.filter(v => !isEmptyCell(v)).map(v => String(v))).size;
      beforeSnapshots.set(col, { missing, unique });
    }
  }

  // 1. Remove Duplicate Rows
  if (removeDuplicates) {
    const seen = new Set<string>();
    const unique: Record<string, any>[] = [];
    for (const row of current) {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        duplicatesRemoved++;
      } else {
        seen.add(key);
        unique.push(row);
      }
    }
    current = unique;
    if (duplicatesRemoved > 0) {
      appliedRules.push(`Menghapus ${duplicatesRemoved} baris duplikat eksak`);
    }
  }

  // 2. Process column rules
  for (const rule of rules) {
    const col = rule.column;
    let colOutliersAdjusted = 0;

    // Trimming & Text normalization
    const normMode = rule.textNormalizeMode || (rule.trimWhitespace ? 'trim' : 'none');
    if (normMode !== 'none') {
      let modified = 0;
      current.forEach(row => {
        if (typeof row[col] === 'string') {
          const orig = row[col];
          let next = orig.trim().replace(/\s+/g, ' ');
          if (normMode === 'lowercase') next = next.toLowerCase();
          else if (normMode === 'uppercase') next = next.toUpperCase();
          else if (normMode === 'titlecase') next = toTitleCase(next);
          if (next !== orig) modified++;
          row[col] = next;
        }
      });
      if (modified > 0) {
        appliedRules.push(`Normalisasi teks [${col}] (${normMode}) pada ${modified} sel`);
      }
    }

    // Category standardization / synonym mapping
    if (rule.categoryMapping && Object.keys(rule.categoryMapping).length > 0) {
      let mapped = 0;
      current.forEach(row => {
        const key = String(row[col] ?? '').trim();
        if (key && rule.categoryMapping![key] !== undefined) {
          row[col] = rule.categoryMapping![key];
          mapped++;
        }
      });
      categoriesStandardized += mapped;
      if (mapped > 0) {
        appliedRules.push(`Standarisasi kategori pada [${col}] (${mapped} baris)`);
      }
    }

    // ISO Date normalization
    if (rule.normalizeDateIso || rule.convertType === 'date') {
      let dCount = 0;
      current.forEach(row => {
        if (!isEmptyCell(row[col])) {
          const iso = toIsoDate(row[col]);
          if (iso && iso !== row[col]) {
            row[col] = iso;
            dCount++;
          }
        }
      });
      datesNormalized += dCount;
      typeConversions += dCount;
      if (dCount > 0) {
        appliedRules.push(`Standarisasi format tanggal ISO (YYYY-MM-DD) di [${col}] (${dCount} sel)`);
      }
    }

    // Type conversion
    if (rule.convertType === 'numeric') {
      let converted = 0;
      current.forEach(row => {
        const val = row[col];
        if (!isEmptyCell(val) && typeof val !== 'number') {
          const num = Number(String(val).replace(/^(rp\.?|idr|\$|€|£)\s*/i, '').replace(/[, %]/g, ''));
          if (!Number.isNaN(num)) {
            row[col] = num;
            converted++;
          }
        }
      });
      typeConversions += converted;
      if (converted > 0) {
        appliedRules.push(`Konversi tipe [${col}] ke Numeric (${converted} sel)`);
      }
    } else if (rule.convertType === 'boolean') {
      let converted = 0;
      current.forEach(row => {
        if (!isEmptyCell(row[col])) {
          const low = String(row[col]).trim().toLowerCase();
          if (['true', 'yes', 'ya', '1'].includes(low)) {
            row[col] = true;
            converted++;
          } else if (['false', 'no', 'tidak', '0'].includes(low)) {
            row[col] = false;
            converted++;
          }
        }
      });
      typeConversions += converted;
      if (converted > 0) appliedRules.push(`Konversi tipe [${col}] ke Boolean (${converted} sel)`);
    } else if (rule.convertType === 'text') {
      let converted = 0;
      current.forEach(row => {
        if (!isEmptyCell(row[col]) && typeof row[col] !== 'string') {
          row[col] = String(row[col]);
          converted++;
        }
      });
      typeConversions += converted;
      if (converted > 0) appliedRules.push(`Konversi tipe [${col}] ke Text (${converted} sel)`);
    }

    // Missing value handling
    if (rule.missingAction === 'drop_row') {
      const beforeCount = current.length;
      current = current.filter(row => !isEmptyCell(row[col]));
      const dropped = beforeCount - current.length;
      missingValuesHandled += dropped;
      if (dropped > 0) appliedRules.push(`Menghapus ${dropped} baris dengan nilai kosong di [${col}]`);
    } else if (rule.missingAction === 'fill_mean' || rule.missingAction === 'fill_median') {
      const validNumbers = current
        .map(r => r[col])
        .filter(v => typeof v === 'number' && !Number.isNaN(v));
      const stats = computeNumericStats(validNumbers);
      const fillVal = stats ? (rule.missingAction === 'fill_mean' ? stats.mean : stats.median) : 0;
      let filled = 0;
      current.forEach(row => {
        if (isEmptyCell(row[col])) {
          row[col] = fillVal;
          filled++;
        }
      });
      missingValuesHandled += filled;
      if (filled > 0) {
        appliedRules.push(`Imputasi ${filled} nilai kosong di [${col}] dengan ${rule.missingAction === 'fill_mean' ? 'Mean' : 'Median'}: ${fillVal}`);
      }
    } else if (rule.missingAction === 'fill_mode') {
      const modeVal = computeModeValue(current.map(r => r[col]));
      if (modeVal !== null) {
        let filled = 0;
        current.forEach(row => {
          if (isEmptyCell(row[col])) {
            row[col] = modeVal;
            filled++;
          }
        });
        missingValuesHandled += filled;
        if (filled > 0) appliedRules.push(`Imputasi ${filled} nilai kosong di [${col}] dengan Mode: '${modeVal}'`);
      }
    } else if (rule.missingAction === 'fill_ffill') {
      let lastValid: any = undefined;
      let filled = 0;
      for (const row of current) {
        if (!isEmptyCell(row[col])) {
          lastValid = row[col];
        } else if (lastValid !== undefined) {
          row[col] = lastValid;
          filled++;
        }
      }
      missingValuesHandled += filled;
      if (filled > 0) appliedRules.push(`Forward-Fill ${filled} nilai kosong di [${col}]`);
    } else if (rule.missingAction === 'fill_bfill') {
      let nextValid: any = undefined;
      let filled = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        if (!isEmptyCell(current[i][col])) {
          nextValid = current[i][col];
        } else if (nextValid !== undefined) {
          current[i][col] = nextValid;
          filled++;
        }
      }
      missingValuesHandled += filled;
      if (filled > 0) appliedRules.push(`Backward-Fill ${filled} nilai kosong di [${col}]`);
    } else if (rule.missingAction === 'fill_custom' && rule.customFillValue !== undefined) {
      let filled = 0;
      current.forEach(row => {
        if (isEmptyCell(row[col])) {
          row[col] = rule.customFillValue;
          filled++;
        }
      });
      missingValuesHandled += filled;
      if (filled > 0) appliedRules.push(`Mengisi ${filled} nilai kosong di [${col}] dengan '${rule.customFillValue}'`);
    }

    // Outlier handling (IQR / Z-Score / Percentile)
    if (rule.outlierAction && rule.outlierAction !== 'keep') {
      const numbers = current
        .map(r => r[col])
        .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
        .sort((a, b) => a - b);

      const method: OutlierMethod = rule.outlierMethod || 'iqr';
      let lower: number | null = null;
      let upper: number | null = null;

      if (numbers.length >= 4) {
        if (method === 'iqr') {
          const stats = computeNumericStats(numbers);
          if (stats && stats.iqr > 0) {
            lower = stats.q1 - 1.5 * stats.iqr;
            upper = stats.q3 + 1.5 * stats.iqr;
          }
        } else if (method === 'zscore') {
          const mean = numbers.reduce((s, v) => s + v, 0) / numbers.length;
          const sd = Math.sqrt(numbers.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / numbers.length);
          if (sd > 0) {
            lower = mean - 3 * sd;
            upper = mean + 3 * sd;
          }
        } else if (method === 'percentile') {
          lower = numbers[Math.floor((numbers.length - 1) * 0.05)];
          upper = numbers[Math.floor((numbers.length - 1) * 0.95)];
        }
      }

      if (lower !== null && upper !== null && upper > lower) {
        const lo = lower;
        const hi = upper;
        if (rule.outlierAction === 'drop_row') {
          const before = current.length;
          current = current.filter(r => {
            const v = r[col];
            if (typeof v !== 'number' || Number.isNaN(v)) return true;
            return v >= lo && v <= hi;
          });
          const dropped = before - current.length;
          outliersAdjusted += dropped;
          colOutliersAdjusted += dropped;
          if (dropped > 0) {
            appliedRules.push(
              `Menghapus ${dropped} baris outlier (${method.toUpperCase()}) di luar [${lo.toFixed(1)}, ${hi.toFixed(1)}] pada [${col}]`
            );
          }
        } else if (rule.outlierAction === 'cap_bounds') {
          let capped = 0;
          current.forEach(row => {
            const v = row[col];
            if (typeof v === 'number' && !Number.isNaN(v)) {
              if (v < lo) {
                row[col] = Math.round(lo * 100) / 100;
                capped++;
              } else if (v > hi) {
                row[col] = Math.round(hi * 100) / 100;
                capped++;
              }
            }
          });
          outliersAdjusted += capped;
          colOutliersAdjusted += capped;
          if (capped > 0) {
            appliedRules.push(
              `Capping ${capped} outlier (${method.toUpperCase()}) ke batas [${lo.toFixed(1)}, ${hi.toFixed(1)}] pada [${col}]`
            );
          }
        }
      }
    }

    // Track per-column diff
    beforeSnapshots.set(`${col}__adj`, {
      missing: colOutliersAdjusted,
      unique: 0,
    });
  }

  const columnDiffs: ColumnDiffSummary[] = rules.map(r => {
    const snap = beforeSnapshots.get(r.column) || { missing: 0, unique: 0 };
    const afterVals = current.map(row => row[r.column]);
    const missingAfter = afterVals.filter(isEmptyCell).length;
    const uniqueAfter = new Set(afterVals.filter(v => !isEmptyCell(v)).map(v => String(v))).size;
    const adj = beforeSnapshots.get(`${r.column}__adj`)?.missing || 0;
    return {
      column: r.column,
      missingBefore: snap.missing,
      missingAfter,
      uniqueBefore: snap.unique,
      uniqueAfter,
      outliersAdjusted: adj,
    };
  });

  return {
    cleanedData: current,
    report: {
      originalRowCount: data.length,
      newRowCount: current.length,
      duplicatesRemoved,
      missingValuesHandled,
      outliersAdjusted,
      typeConversions,
      datesNormalized,
      categoriesStandardized,
      appliedRules,
      columnDiffs,
    },
  };
}
