/**
 * Deterministic ETL / ELT Transformation Engine
 * Safe expression parsing (no eval/new Function) and key-validated Join/Merge.
 */

export type EtlAggregationFn = 'sum' | 'avg' | 'min' | 'max' | 'count';

export type EtlOperation =
  | { type: 'rename_column'; fromColumn: string; toColumn: string }
  | { type: 'cast_type'; column: string; targetType: 'numeric' | 'date' | 'boolean' | 'text' }
  | {
      type: 'filter_rows';
      column: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'not_null';
      value?: string | number;
    }
  | {
      type: 'group_by';
      groupColumns: string[];
      aggregations: { column: string; fn: EtlAggregationFn; outputName?: string }[];
    }
  | {
      type: 'pivot';
      rowColumn: string;
      pivotColumn: string;
      valueColumn: string;
      fn: EtlAggregationFn;
    }
  | {
      type: 'unpivot';
      idColumns: string[];
      valueColumns: string[];
      variableName: string;
      valueName: string;
    }
  | { type: 'calculated_column'; newColumnName: string; expression: string }
  | { type: 'date_dimensions'; dateColumn: string }
  | { type: 'normalize_numeric'; column: string; method: 'minmax' | 'zscore'; newColumnName?: string };

export interface EtlTransformResult {
  success: boolean;
  data: Record<string, any>[];
  summary: string;
  error?: string;
}

/**
 * Safe arithmetic expression evaluator using Shunting-Yard + RPN stack.
 * Supports: [Column Name], numeric literals, +, -, *, /, (, )
 */
export function evaluateSafeRowExpression(
  expression: string,
  row: Record<string, any>
): number | null {
  // Replace [Col] references with their numeric value in row
  const resolvedExpr = expression.replace(/\[([^\]]+)\]/g, (_, colName) => {
    const v = row[colName.trim()];
    const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[, $%]/g, ''));
    return Number.isFinite(n) ? String(n) : 'NaN';
  });

  if (resolvedExpr.includes('NaN')) return null;

  // Tokenize numbers, operators, and parentheses
  const tokens: string[] = [];
  let i = 0;
  while (i < resolvedExpr.length) {
    const ch = resolvedExpr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ('+-*/()'.includes(ch)) {
      // Handle unary minus at start or after operator/'('
      if (
        ch === '-' &&
        (tokens.length === 0 || '+-*/('.includes(tokens[tokens.length - 1]))
      ) {
        let numStr = '-';
        i++;
        while (i < resolvedExpr.length && /[\d.]/.test(resolvedExpr[i])) {
          numStr += resolvedExpr[i++];
        }
        if (numStr === '-') return null;
        tokens.push(numStr);
        continue;
      }
      tokens.push(ch);
      i++;
    } else if (/[\d.]/.test(ch)) {
      let numStr = '';
      while (i < resolvedExpr.length && /[\d.]/.test(resolvedExpr[i])) {
        numStr += resolvedExpr[i++];
      }
      tokens.push(numStr);
    } else {
      return null;
    }
  }

  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const output: (number | string)[] = [];
  const ops: string[] = [];

  for (const tok of tokens) {
    if (/^-?\d+(\.\d+)?$/.test(tok)) {
      output.push(Number(tok));
    } else if (tok in prec) {
      while (
        ops.length > 0 &&
        ops[ops.length - 1] !== '(' &&
        prec[ops[ops.length - 1]] >= prec[tok]
      ) {
        output.push(ops.pop()!);
      }
      ops.push(tok);
    } else if (tok === '(') {
      ops.push(tok);
    } else if (tok === ')') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(') {
        output.push(ops.pop()!);
      }
      if (ops[ops.length - 1] !== '(') return null;
      ops.pop();
    } else {
      return null;
    }
  }

  while (ops.length > 0) {
    const op = ops.pop()!;
    if (op === '(') return null;
    output.push(op);
  }

  const stack: number[] = [];
  for (const item of output) {
    if (typeof item === 'number') {
      stack.push(item);
    } else {
      if (stack.length < 2) return null;
      const b = stack.pop()!;
      const a = stack.pop()!;
      if (item === '+') stack.push(a + b);
      else if (item === '-') stack.push(a - b);
      else if (item === '*') stack.push(a * b);
      else if (item === '/') {
        if (b === 0) return null;
        stack.push(a / b);
      }
    }
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) return null;
  return Math.round(stack[0] * 10000) / 10000;
}

function aggregateValues(nums: number[], count: number, fn: EtlAggregationFn): number {
  if (fn === 'count') return count;
  if (nums.length === 0) return 0;
  if (fn === 'sum') return Math.round(nums.reduce((s, v) => s + v, 0) * 100) / 100;
  if (fn === 'avg') return Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 100) / 100;
  if (fn === 'min') return Math.min(...nums);
  return Math.max(...nums);
}

export function applyEtlTransform(
  data: Record<string, any>[],
  op: EtlOperation
): EtlTransformResult {
  if (!data || data.length === 0) {
    return { success: false, data: [], summary: '', error: 'Dataset kosong tidak dapat ditransformasi.' };
  }

  const rows = data.map(r => ({ ...r }));

  switch (op.type) {
    case 'rename_column': {
      const from = op.fromColumn.trim();
      const to = op.toColumn.trim();
      if (!from || !to) return { success: false, data: rows, summary: '', error: 'Nama kolom asal dan tujuan wajib diisi.' };
      if (from === to) return { success: true, data: rows, summary: `Kolom '${from}' tidak berubah.` };
      const existingCols = Object.keys(rows[0] || {});
      if (!existingCols.includes(from)) {
        return { success: false, data: rows, summary: '', error: `Kolom '${from}' tidak ditemukan.` };
      }
      if (existingCols.includes(to)) {
        return { success: false, data: rows, summary: '', error: `Kolom '${to}' sudah ada di dataset.` };
      }
      const next = rows.map(r => {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(r)) {
          out[k === from ? to : k] = v;
        }
        return out;
      });
      return { success: true, data: next, summary: `Rename kolom [${from}] ➔ [${to}] (${next.length} baris)` };
    }

    case 'cast_type': {
      const { column, targetType } = op;
      const next = rows.map(r => {
        const v = r[column];
        if (v === null || v === undefined || v === '') return r;
        let castVal: any = v;
        if (targetType === 'numeric') {
          const n = Number(String(v).replace(/^(rp\.?|idr|\$|€|£)\s*/i, '').replace(/[, %]/g, ''));
          castVal = Number.isFinite(n) ? n : null;
        } else if (targetType === 'date') {
          const ts = Date.parse(String(v));
          castVal = Number.isNaN(ts) ? v : new Date(ts).toISOString().slice(0, 10);
        } else if (targetType === 'boolean') {
          const low = String(v).trim().toLowerCase();
          castVal = ['true', 'yes', 'ya', '1'].includes(low);
        } else {
          castVal = String(v);
        }
        return { ...r, [column]: castVal };
      });
      return { success: true, data: next, summary: `Cast tipe [${column}] ke ${targetType.toUpperCase()}` };
    }

    case 'filter_rows': {
      const { column, operator, value } = op;
      const filtered = rows.filter(r => {
        const cell = r[column];
        if (operator === 'not_null') {
          return cell !== null && cell !== undefined && String(cell).trim() !== '';
        }
        if (operator === 'contains') {
          return String(cell ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
        }
        const numCell = typeof cell === 'number' ? cell : Number(cell);
        const numTarget = Number(value);
        if (operator === 'equals') return String(cell ?? '').toLowerCase() === String(value ?? '').toLowerCase();
        if (operator === 'not_equals') return String(cell ?? '').toLowerCase() !== String(value ?? '').toLowerCase();
        if (Number.isNaN(numCell) || Number.isNaN(numTarget)) return false;
        if (operator === 'gt') return numCell > numTarget;
        if (operator === 'gte') return numCell >= numTarget;
        if (operator === 'lt') return numCell < numTarget;
        return numCell <= numTarget;
      });
      if (filtered.length === 0) {
        return { success: false, data: rows, summary: '', error: 'Filter menghasilkan 0 baris. Sesuaikan kondisi filter.' };
      }
      return {
        success: true,
        data: filtered,
        summary: `Filter [${column} ${operator} ${value ?? ''}]: ${rows.length} ➔ ${filtered.length} baris`,
      };
    }

    case 'group_by': {
      if (op.groupColumns.length === 0 || op.aggregations.length === 0) {
        return { success: false, data: rows, summary: '', error: 'Pilih minimal 1 kolom Group By dan 1 kolom Agregasi.' };
      }
      const groups = new Map<string, { keys: Record<string, any>; rows: Record<string, any>[] }>();
      for (const r of rows) {
        const keyTuple = op.groupColumns.map(c => String(r[c] ?? 'NULL')).join('||');
        if (!groups.has(keyTuple)) {
          const keysObj: Record<string, any> = {};
          op.groupColumns.forEach(c => {
            keysObj[c] = r[c] ?? 'NULL';
          });
          groups.set(keyTuple, { keys: keysObj, rows: [] });
        }
        groups.get(keyTuple)!.rows.push(r);
      }

      const result: Record<string, any>[] = [];
      for (const g of groups.values()) {
        const out: Record<string, any> = { ...g.keys };
        for (const agg of op.aggregations) {
          const outKey = agg.outputName || `${agg.fn.toUpperCase()}_${agg.column}`;
          const nums = g.rows
            .map(r => (typeof r[agg.column] === 'number' ? r[agg.column] : Number(r[agg.column])))
            .filter((n: number) => Number.isFinite(n));
          out[outKey] = aggregateValues(nums, g.rows.length, agg.fn);
        }
        result.push(out);
      }
      return {
        success: true,
        data: result,
        summary: `GroupBy [${op.groupColumns.join(', ')}] dengan ${op.aggregations.length} agregasi ➔ ${result.length} baris ringkasan`,
      };
    }

    case 'pivot': {
      const { rowColumn, pivotColumn, valueColumn, fn } = op;
      if (!rowColumn || !pivotColumn || !valueColumn) {
        return { success: false, data: rows, summary: '', error: 'Row, Pivot, dan Value column wajib dipilih.' };
      }
      const pivotHeaders = Array.from(new Set(rows.map(r => String(r[pivotColumn] ?? 'Other')))).slice(0, 20);
      const rowGroups = new Map<string, Record<string, number[]>>();
      for (const r of rows) {
        const rk = String(r[rowColumn] ?? 'Other');
        const pk = String(r[pivotColumn] ?? 'Other');
        if (!pivotHeaders.includes(pk)) continue;
        if (!rowGroups.has(rk)) rowGroups.set(rk, {});
        const map = rowGroups.get(rk)!;
        if (!map[pk]) map[pk] = [];
        const n = typeof r[valueColumn] === 'number' ? r[valueColumn] : Number(r[valueColumn]);
        if (Number.isFinite(n)) map[pk].push(n);
      }
      const result: Record<string, any>[] = [];
      for (const [rk, colMap] of rowGroups.entries()) {
        const out: Record<string, any> = { [rowColumn]: rk };
        pivotHeaders.forEach(ph => {
          const vals = colMap[ph] || [];
          out[ph] = aggregateValues(vals, vals.length, fn);
        });
        result.push(out);
      }
      return {
        success: true,
        data: result,
        summary: `Pivot Table [${rowColumn} × ${pivotColumn}] (${fn.toUpperCase()} of ${valueColumn}) ➔ ${result.length} baris × ${pivotHeaders.length + 1} kolom`,
      };
    }

    case 'unpivot': {
      const { idColumns, valueColumns, variableName, valueName } = op;
      if (valueColumns.length === 0) {
        return { success: false, data: rows, summary: '', error: 'Pilih minimal 1 value column untuk Unpivot.' };
      }
      const varKey = variableName.trim() || 'Variable';
      const valKey = valueName.trim() || 'Value';
      const result: Record<string, any>[] = [];
      for (const r of rows) {
        for (const vc of valueColumns) {
          const out: Record<string, any> = {};
          idColumns.forEach(idc => {
            out[idc] = r[idc];
          });
          out[varKey] = vc;
          out[valKey] = r[vc];
          result.push(out);
        }
      }
      return {
        success: true,
        data: result,
        summary: `Unpivot/Melt ${valueColumns.length} kolom ke [${varKey}, ${valKey}] (${result.length} baris)`,
      };
    }

    case 'calculated_column': {
      const colName = op.newColumnName.trim();
      if (!colName || !op.expression.trim()) {
        return { success: false, data: rows, summary: '', error: 'Nama kolom baru dan formula wajib diisi.' };
      }
      let validCount = 0;
      const next = rows.map(r => {
        const val = evaluateSafeRowExpression(op.expression, r);
        if (val !== null) validCount++;
        return { ...r, [colName]: val };
      });
      if (validCount === 0) {
        return {
          success: false,
          data: rows,
          summary: '',
          error: 'Ekspresi tidak menghasilkan angka valid. Gunakan format: [KolomA] - [KolomB] atau [Profit] / [Revenue] * 100.',
        };
      }
      return {
        success: true,
        data: next,
        summary: `Menambahkan kolom kalkulasi [${colName}] = ${op.expression} (${validCount}/${next.length} baris valid)`,
      };
    }

    case 'date_dimensions': {
      const { dateColumn } = op;
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      let parsedCnt = 0;
      const next = rows.map(r => {
        const raw = r[dateColumn];
        const ts = raw instanceof Date ? raw.getTime() : Date.parse(String(raw ?? ''));
        if (Number.isNaN(ts)) {
          return {
            ...r,
            [`${dateColumn}_Year`]: null,
            [`${dateColumn}_Quarter`]: null,
            [`${dateColumn}_Month`]: null,
            [`${dateColumn}_DayOfWeek`]: null,
          };
        }
        parsedCnt++;
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const q = Math.ceil(m / 3);
        return {
          ...r,
          [`${dateColumn}_Year`]: y,
          [`${dateColumn}_Quarter`]: `Q${q}-${y}`,
          [`${dateColumn}_Month`]: `${y}-${String(m).padStart(2, '0')}`,
          [`${dateColumn}_DayOfWeek`]: days[d.getDay()],
        };
      });
      if (parsedCnt === 0) {
        return { success: false, data: rows, summary: '', error: `Kolom '${dateColumn}' tidak memiliki tanggal valid.` };
      }
      return {
        success: true,
        data: next,
        summary: `Ekstrak dimensi waktu (Year, Quarter, Month, DayOfWeek) dari [${dateColumn}]`,
      };
    }

    case 'normalize_numeric': {
      const { column, method, newColumnName } = op;
      const outCol = newColumnName?.trim() || `${column}_${method}`;
      const nums = rows
        .map(r => (typeof r[column] === 'number' ? r[column] : Number(r[column])))
        .filter((n: number) => Number.isFinite(n));
      if (nums.length < 2) {
        return { success: false, data: rows, summary: '', error: `Kolom '${column}' membutuhkan >= 2 angka valid.` };
      }
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
      const sd = Math.sqrt(nums.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / nums.length);

      const next = rows.map(r => {
        const n = typeof r[column] === 'number' ? r[column] : Number(r[column]);
        if (!Number.isFinite(n)) return { ...r, [outCol]: null };
        let val = 0;
        if (method === 'minmax') {
          val = max === min ? 0 : (n - min) / (max - min);
        } else {
          val = sd === 0 ? 0 : (n - mean) / sd;
        }
        return { ...r, [outCol]: Math.round(val * 10000) / 10000 };
      });
      return {
        success: true,
        data: next,
        summary: `Normalisasi ${method.toUpperCase()} pada [${column}] ➔ [${outCol}]`,
      };
    }
  }
}

export interface MergeDatasetsResult {
  success: boolean;
  data: Record<string, any>[];
  overlapCount: number;
  summary: string;
  error?: string;
}

/**
 * Key-validated Join/Merge between two datasets.
 * Blocks auto-merge when overlap count is 0 to prevent spurious cross-joins or empty results.
 */
export function mergeDatasetsByKey(params: {
  leftData: Record<string, any>[];
  rightData: Record<string, any>[];
  leftKey: string;
  rightKey: string;
  joinType: 'inner' | 'left';
  rightPrefix?: string;
}): MergeDatasetsResult {
  const { leftData, rightData, leftKey, rightKey, joinType, rightPrefix = 'R_' } = params;
  if (!leftData.length || !rightData.length) {
    return {
      success: false,
      data: [],
      overlapCount: 0,
      summary: '',
      error: 'Salah satu atau kedua dataset kosong; proses Merge dibatalkan.',
    };
  }
  if (!leftKey || !rightKey) {
    return {
      success: false,
      data: [],
      overlapCount: 0,
      summary: '',
      error: 'Kolom kunci (Join Key) dari kedua dataset wajib dipilih.',
    };
  }

  const rightIndex = new Map<string, Record<string, any>[]>();
  for (const rRow of rightData) {
    const k = String(rRow[rightKey] ?? '').trim().toLowerCase();
    if (!k) continue;
    if (!rightIndex.has(k)) rightIndex.set(k, []);
    rightIndex.get(k)!.push(rRow);
  }

  let overlapCount = 0;
  const merged: Record<string, any>[] = [];
  const leftCols = new Set(Object.keys(leftData[0] || {}));
  const rightCols = Object.keys(rightData[0] || {}).filter(c => c !== rightKey);

  for (const lRow of leftData) {
    const lk = String(lRow[leftKey] ?? '').trim().toLowerCase();
    const matches = lk ? rightIndex.get(lk) : undefined;

    if (matches && matches.length > 0) {
      overlapCount++;
      for (const m of matches) {
        const combined: Record<string, any> = { ...lRow };
        for (const rc of rightCols) {
          const outKey = leftCols.has(rc) ? `${rightPrefix}${rc}` : rc;
          combined[outKey] = m[rc];
        }
        merged.push(combined);
      }
    } else if (joinType === 'left') {
      const combined: Record<string, any> = { ...lRow };
      for (const rc of rightCols) {
        const outKey = leftCols.has(rc) ? `${rightPrefix}${rc}` : rc;
        combined[outKey] = null;
      }
      merged.push(combined);
    }
  }

  if (overlapCount === 0) {
    return {
      success: false,
      data: [],
      overlapCount: 0,
      summary: '',
      error: `Tidak ditemukan kesamaan nilai key antara [${leftKey}] dan [${rightKey}] (0 overlap). Pilih kolom kunci yang valid untuk menggabungkan dataset.`,
    };
  }

  return {
    success: true,
    data: merged,
    overlapCount,
    summary: `${joinType.toUpperCase()} JOIN pada [${leftKey} = ${rightKey}] berhasil mencocokkan ${overlapCount} key ➔ ${merged.length} baris hasil.`,
  };
}
