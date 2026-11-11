import { computeNumericStats } from './analytics';

export type MissingAction = 'drop_row' | 'fill_mean' | 'fill_median' | 'fill_mode' | 'fill_custom';
export type OutlierAction = 'keep' | 'drop_row' | 'cap_bounds';

export interface CleaningRule {
  column: string;
  missingAction?: MissingAction;
  customFillValue?: string | number;
  outlierAction?: OutlierAction;
  convertType?: 'numeric' | 'date' | 'text';
  trimWhitespace?: boolean;
}

export interface CleaningReport {
  originalRowCount: number;
  newRowCount: number;
  duplicatesRemoved: number;
  missingValuesHandled: number;
  outliersAdjusted: number;
  typeConversions: number;
  appliedRules: string[];
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
        appliedRules: []
      }
    };
  }

  let current = data.map(row => ({ ...row }));
  const appliedRules: string[] = [];
  let duplicatesRemoved = 0;
  let missingValuesHandled = 0;
  let outliersAdjusted = 0;
  let typeConversions = 0;

  // 1. Remove Duplicates
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
      appliedRules.push(`Removed ${duplicatesRemoved} duplicate rows`);
    }
  }

  // 2. Process column rules
  for (const rule of rules) {
    const col = rule.column;

    // Type conversion & trimming
    if (rule.trimWhitespace) {
      current.forEach(row => {
        if (typeof row[col] === 'string') {
          row[col] = row[col].trim();
        }
      });
      appliedRules.push(`Trimmed whitespace in [${col}]`);
    }

    if (rule.convertType === 'numeric') {
      let converted = 0;
      current.forEach(row => {
        const val = row[col];
        if (val !== null && val !== undefined && val !== '') {
          const num = Number(String(val).replace(/[$€£, %]/g, ''));
          if (!isNaN(num)) {
            row[col] = num;
            converted++;
          }
        }
      });
      typeConversions += converted;
      appliedRules.push(`Converted [${col}] to numeric format (${converted} cells)`);
    }

    // Missing value handling
    if (rule.missingAction === 'drop_row') {
      const beforeCount = current.length;
      current = current.filter(row => row[col] !== null && row[col] !== undefined && row[col] !== '');
      const dropped = beforeCount - current.length;
      missingValuesHandled += dropped;
      if (dropped > 0) appliedRules.push(`Dropped ${dropped} rows with missing [${col}]`);
    } else if (rule.missingAction === 'fill_mean' || rule.missingAction === 'fill_median') {
      const validNumbers = current.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v));
      const stats = computeNumericStats(validNumbers);
      const fillVal = stats ? (rule.missingAction === 'fill_mean' ? stats.mean : stats.median) : 0;
      let filled = 0;
      current.forEach(row => {
        if (row[col] === null || row[col] === undefined || row[col] === '') {
          row[col] = fillVal;
          filled++;
        }
      });
      missingValuesHandled += filled;
      if (filled > 0) appliedRules.push(`Imputed ${filled} missing in [${col}] with ${rule.missingAction}: ${fillVal}`);
    } else if (rule.missingAction === 'fill_custom' && rule.customFillValue !== undefined) {
      let filled = 0;
      current.forEach(row => {
        if (row[col] === null || row[col] === undefined || row[col] === '') {
          row[col] = rule.customFillValue;
          filled++;
        }
      });
      missingValuesHandled += filled;
      if (filled > 0) appliedRules.push(`Filled ${filled} missing in [${col}] with '${rule.customFillValue}'`);
    }

    // Outlier handling
    if (rule.outlierAction && rule.outlierAction !== 'keep') {
      const numbers = current.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v));
      const stats = computeNumericStats(numbers);
      if (stats && stats.iqr > 0) {
        const lower = stats.q1 - 1.5 * stats.iqr;
        const upper = stats.q3 + 1.5 * stats.iqr;

        if (rule.outlierAction === 'drop_row') {
          const before = current.length;
          current = current.filter(r => {
            const v = r[col];
            if (typeof v !== 'number' || isNaN(v)) return true;
            return v >= lower && v <= upper;
          });
          const dropped = before - current.length;
          outliersAdjusted += dropped;
          if (dropped > 0) appliedRules.push(`Dropped ${dropped} outlier rows outside [${lower.toFixed(1)}, ${upper.toFixed(1)}] in [${col}]`);
        } else if (rule.outlierAction === 'cap_bounds') {
          let capped = 0;
          current.forEach(row => {
            const v = row[col];
            if (typeof v === 'number' && !isNaN(v)) {
              if (v < lower) {
                row[col] = Math.round(lower * 100) / 100;
                capped++;
              } else if (v > upper) {
                row[col] = Math.round(upper * 100) / 100;
                capped++;
              }
            }
          });
          outliersAdjusted += capped;
          if (capped > 0) appliedRules.push(`Capped ${capped} outliers to bounds [${lower.toFixed(1)}, ${upper.toFixed(1)}] in [${col}]`);
        }
      }
    }
  }

  return {
    cleanedData: current,
    report: {
      originalRowCount: data.length,
      newRowCount: current.length,
      duplicatesRemoved,
      missingValuesHandled,
      outliersAdjusted,
      typeConversions,
      appliedRules
    }
  };
}
