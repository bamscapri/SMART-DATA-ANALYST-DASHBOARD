export interface ColumnMeta {
  name: string;
  type: 'numeric' | 'date' | 'categorical' | 'text';
  missingCount: number;
  uniqueCount: number;
  sampleValues: (string | number)[];
  stats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    sum: number;
    q1: number;
    q3: number;
    iqr: number;
  };
}

export interface DatasetStats {
  rowCount: number;
  colCount: number;
  numericCols: string[];
  dateCols: string[];
  categoricalCols: string[];
  textCols: string[];
  missingCells: number;
  duplicateRows: number;
  columns: ColumnMeta[];
}

/**
 * Infer the data type of a column based on values
 */
export function inferColumnType(values: any[]): 'numeric' | 'date' | 'categorical' | 'text' {
  const nonNulls = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNulls.length === 0) return 'text';

  let numericCount = 0;
  let dateCount = 0;
  const uniqueSet = new Set(nonNulls.map(v => String(v).trim()));

  for (const val of nonNulls) {
    if (typeof val === 'number' && !isNaN(val)) {
      numericCount++;
    } else if (typeof val === 'string') {
      const cleanStr = val.replace(/[$€£, %]/g, '').trim();
      if (cleanStr !== '' && !isNaN(Number(cleanStr))) {
        numericCount++;
      } else {
        // Only classify as date if it matches common date patterns and passes Date.parse
        const isDatePattern = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(val) || 
                              /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(val) ||
                              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val);
        if (isDatePattern && !isNaN(Date.parse(val))) {
          dateCount++;
        }
      }
    }
  }

  const threshold = nonNulls.length * 0.75;
  if (numericCount >= threshold) return 'numeric';
  if (dateCount >= threshold) return 'date';

  const avgLength = nonNulls.reduce((sum, v) => sum + String(v).length, 0) / nonNulls.length;
  // If strings are long descriptions and mostly unique, classify as free text
  if (avgLength > 15 && (uniqueSet.size / nonNulls.length) >= 0.8) {
    return 'text';
  }

  // Categorical if unique values are small or low cardinality ratio
  if (uniqueSet.size <= 25 || (uniqueSet.size / nonNulls.length) <= 0.4) return 'categorical';
  return 'text';
}

/**
 * Computes descriptive statistics for an array of numbers
 */
export function computeNumericStats(rawValues: any[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  sum: number;
  q1: number;
  q3: number;
  iqr: number;
} | undefined {
  const numbers: number[] = [];
  for (const v of rawValues) {
    if (v === null || v === undefined || v === '') continue;
    let num: number;
    if (typeof v === 'number') {
      num = v;
    } else {
      const clean = String(v).replace(/[$€£, %]/g, '').trim();
      num = Number(clean);
    }
    if (!isNaN(num)) numbers.push(num);
  }

  if (numbers.length === 0) return undefined;

  numbers.sort((a, b) => a - b);
  const sum = numbers.reduce((acc, curr) => acc + curr, 0);
  const mean = sum / numbers.length;
  const min = numbers[0];
  const max = numbers[numbers.length - 1];

  const mid = Math.floor(numbers.length / 2);
  const median = numbers.length % 2 === 0 ? (numbers[mid - 1] + numbers[mid]) / 2 : numbers[mid];

  const q1Index = Math.floor(numbers.length * 0.25);
  const q3Index = Math.floor(numbers.length * 0.75);
  const q1 = numbers[q1Index];
  const q3 = numbers[q3Index];
  const iqr = q3 - q1;

  const variance = numbers.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / numbers.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    sum: Math.round(sum * 100) / 100,
    q1: Math.round(q1 * 100) / 100,
    q3: Math.round(q3 * 100) / 100,
    iqr: Math.round(iqr * 100) / 100
  };
}

/**
 * Analyzes entire tabular dataset and returns metadata and statistics
 */
export function analyzeDataset(data: Record<string, any>[]): DatasetStats {
  if (!data || data.length === 0) {
    return {
      rowCount: 0,
      colCount: 0,
      numericCols: [],
      dateCols: [],
      categoricalCols: [],
      textCols: [],
      missingCells: 0,
      duplicateRows: 0,
      columns: []
    };
  }

  const columns = Object.keys(data[0]);
  let totalMissing = 0;

  // Check duplicate rows
  const rowHash = new Set<string>();
  let duplicates = 0;
  for (const row of data) {
    const serialized = JSON.stringify(row);
    if (rowHash.has(serialized)) {
      duplicates++;
    } else {
      rowHash.add(serialized);
    }
  }

  const columnMetas: ColumnMeta[] = columns.map(colName => {
    const values = data.map(r => r[colName]);
    const missing = values.filter(v => v === null || v === undefined || v === '').length;
    totalMissing += missing;

    const uniqueSet = new Set(values.filter(v => v !== null && v !== undefined && v !== '').map(v => String(v)));
    const inferredType = inferColumnType(values);

    let stats;
    if (inferredType === 'numeric') {
      stats = computeNumericStats(values);
    }

    return {
      name: colName,
      type: inferredType,
      missingCount: missing,
      uniqueCount: uniqueSet.size,
      sampleValues: Array.from(uniqueSet).slice(0, 5),
      stats
    };
  });

  return {
    rowCount: data.length,
    colCount: columns.length,
    numericCols: columnMetas.filter(c => c.type === 'numeric').map(c => c.name),
    dateCols: columnMetas.filter(c => c.type === 'date').map(c => c.name),
    categoricalCols: columnMetas.filter(c => c.type === 'categorical').map(c => c.name),
    textCols: columnMetas.filter(c => c.type === 'text').map(c => c.name),
    missingCells: totalMissing,
    duplicateRows: duplicates,
    columns: columnMetas
  };
}

/**
 * Detect outliers using IQR rule (values < Q1 - 1.5*IQR or > Q3 + 1.5*IQR)
 */
export function detectOutliers(values: number[]): { index: number; value: number }[] {
  const stats = computeNumericStats(values);
  if (!stats || stats.iqr === 0) return [];

  const lowerBound = stats.q1 - 1.5 * stats.iqr;
  const upperBound = stats.q3 + 1.5 * stats.iqr;

  const outliers: { index: number; value: number }[] = [];
  values.forEach((val, idx) => {
    if (val < lowerBound || val > upperBound) {
      outliers.push({ index: idx, value: val });
    }
  });

  return outliers;
}
