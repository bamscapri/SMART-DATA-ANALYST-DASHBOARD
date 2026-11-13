export type ForecastMethod = 'linear' | 'moving_average' | 'exponential_smoothing';
export type ForecastHorizon = '7d' | '30d' | '3m' | '6m' | '12m';
export type ConfidenceLevel = 0.80 | 0.90 | 0.95 | 0.99;

export interface DataPoint {
  date: string;
  value: number;
}

export interface ForecastResultPoint {
  date: string;
  historical?: number;
  forecast?: number;
  lowerBound?: number;
  upperBound?: number;
  ciRange?: [number, number];
  marginOfError?: number;
}

export interface ForecastEvaluation {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
  trend: 'UPWARD' | 'DOWNWARD' | 'STABLE';
  growthPercentage: number;
  sampleSize: number;
  confidenceLevel: number;
  zScore: number;
  meanProjected: number;
  ciLower: number;
  ciUpper: number;
  averageMarginOfError: number;
}

export interface ForecastOutput {
  points: ForecastResultPoint[];
  evaluation: ForecastEvaluation;
  horizonSteps: number;
  method: ForecastMethod;
  confidenceLevel: ConfidenceLevel;
}

/**
 * Returns Z-score corresponding to selected confidence level
 */
export function getZScore(confidenceLevel: ConfidenceLevel = 0.95): number {
  switch (confidenceLevel) {
    case 0.80: return 1.282;
    case 0.90: return 1.645;
    case 0.95: return 1.960;
    case 0.99: return 2.576;
    default: return 1.960;
  }
}

/**
 * Parses horizon string into number of future data points
 */
export function getHorizonSteps(horizon: ForecastHorizon): number {
  switch (horizon) {
    case '7d': return 7;
    case '30d': return 30;
    case '3m': return 90;
    case '6m': return 180;
    case '12m': return 365;
    default: return 30;
  }
}

/**
 * Calculates evaluation metrics: MAE, RMSE, MAPE, R2
 */
export function calculateMetrics(actuals: number[], predicted: number[]): {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
} {
  const n = Math.min(actuals.length, predicted.length);
  if (n === 0) return { mae: 0, rmse: 0, mape: 0, r2: 0 };

  let absErrorSum = 0;
  let sqErrorSum = 0;
  let pctErrorSum = 0;
  let actualSum = 0;

  for (let i = 0; i < n; i++) {
    const act = actuals[i];
    const pred = predicted[i];
    const diff = act - pred;

    absErrorSum += Math.abs(diff);
    sqErrorSum += diff * diff;
    if (act !== 0) {
      pctErrorSum += Math.abs(diff / act);
    }
    actualSum += act;
  }

  const meanActual = actualSum / n;
  let totalVariance = 0;
  for (let i = 0; i < n; i++) {
    totalVariance += Math.pow(actuals[i] - meanActual, 2);
  }

  const mae = absErrorSum / n;
  const rmse = Math.sqrt(sqErrorSum / n);
  const mape = (pctErrorSum / n) * 100;
  const r2 = totalVariance === 0 ? 1 : Math.max(0, 1 - (sqErrorSum / totalVariance));

  return {
    mae: Math.round(mae * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    mape: Math.round(mape * 100) / 100,
    r2: Math.round(r2 * 1000) / 1000
  };
}

/**
 * Linear Regression Forecast
 */
export function runLinearRegression(values: number[], steps: number): {
  fitted: number[];
  forecasts: number[];
  slope: number;
  intercept: number;
} {
  const n = values.length;
  if (n === 0) return { fitted: [], forecasts: [], slope: 0, intercept: 0 };
  if (n === 1) {
    const val = values[0];
    return {
      fitted: [val],
      forecasts: Array(steps).fill(val),
      slope: 0,
      intercept: val
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = (n * sumXX - sumX * sumX);
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const fitted: number[] = [];
  for (let i = 0; i < n; i++) {
    fitted.push(intercept + slope * i);
  }

  const forecasts: number[] = [];
  for (let i = 0; i < steps; i++) {
    const x = n + i;
    forecasts.push(Math.max(0, intercept + slope * x));
  }

  return { fitted, forecasts, slope, intercept };
}

/**
 * Moving Average Forecast
 */
export function runMovingAverage(values: number[], steps: number, windowSize: number = 5): {
  fitted: number[];
  forecasts: number[];
} {
  const n = values.length;
  if (n === 0) return { fitted: [], forecasts: [] };
  const fitted: number[] = [];
  const window = Math.min(windowSize, Math.max(2, Math.floor(n / 2)));

  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - window + 1);
    const sub = values.slice(start, i + 1);
    const avg = sub.reduce((a, b) => a + b, 0) / sub.length;
    fitted.push(avg);
  }

  // Future steps: iterative moving average
  const extended = [...values];
  const forecasts: number[] = [];
  for (let s = 0; s < steps; s++) {
    const recent = extended.slice(-window);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    forecasts.push(avg);
    extended.push(avg);
  }

  return { fitted, forecasts };
}

/**
 * Simple Exponential Smoothing
 */
export function runExponentialSmoothing(values: number[], steps: number, alpha: number = 0.3): {
  fitted: number[];
  forecasts: number[];
} {
  const n = values.length;
  if (n === 0) return { fitted: [], forecasts: [] };

  const fitted: number[] = [values[0]];
  for (let i = 1; i < n; i++) {
    const val = alpha * values[i] + (1 - alpha) * fitted[i - 1];
    fitted.push(val);
  }

  const lastFitted = fitted[fitted.length - 1];
  const drift = (values[n - 1] - values[0]) / Math.max(1, n);
  const forecasts: number[] = [];
  for (let s = 1; s <= steps; s++) {
    forecasts.push(Math.max(0, lastFitted + drift * s));
  }

  return { fitted, forecasts };
}

/**
 * Validates whether string is an actual calendar date format (YYYY-MM-DD, DD/MM/YYYY, etc.)
 */
export function isValidCalendarDate(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  // Common calendar date patterns: YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, MM/DD/YYYY, or ISO timestamp
  const isDatePattern =
    /^\d{4}[-/]\d{1,2}(?:[-/]\d{1,2})?(?:T.*)?$/.test(trimmed) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(trimmed);
  if (!isDatePattern) return false;
  return !isNaN(Date.parse(trimmed));
}

/**
 * Safely parses and increments dates, avoiding RangeError on non-ISO dates
 */
function generateNextDateString(lastDateStr: string, stepIndex: number): string {
  if (!lastDateStr) return `T+${stepIndex}`;
  const trimmed = lastDateStr.trim();

  // If it's a sequence ending with a number (e.g., "Periode 3", "Week 12", "Month 4", "Q3")
  const numMatch = trimmed.match(/^(.*?)(\d+)$/);
  if (numMatch && !isValidCalendarDate(trimmed)) {
    const prefix = numMatch[1];
    const num = parseInt(numMatch[2], 10);
    return `${prefix}${num + stepIndex}`;
  }

  // If it's a valid calendar date
  if (isValidCalendarDate(trimmed)) {
    const timestamp = Date.parse(trimmed);
    const d = new Date(timestamp);
    d.setDate(d.getDate() + stepIndex);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  return `${trimmed} +${stepIndex}`;
}

/**
 * Main forecasting pipeline with comprehensive Confidence Interval calculation
 */
export function generateForecast(
  history: DataPoint[],
  method: ForecastMethod = 'linear',
  horizon: ForecastHorizon = '30d',
  confidenceLevel: ConfidenceLevel = 0.95
): ForecastOutput {
  if (!history || history.length === 0) {
    return {
      points: [],
      evaluation: {
        mae: 0,
        rmse: 0,
        mape: 0,
        r2: 0,
        trend: 'STABLE',
        growthPercentage: 0,
        sampleSize: 0,
        confidenceLevel: 0.95,
        zScore: 1.96,
        meanProjected: 0,
        ciLower: 0,
        ciUpper: 0,
        averageMarginOfError: 0
      },
      horizonSteps: getHorizonSteps(horizon),
      method,
      confidenceLevel
    };
  }

  // Safe sort: if dates are valid calendar timestamps sort chronologically, otherwise preserve original order
  const hasValidDates = history.every(d => isValidCalendarDate(d.date));
  const sorted = hasValidDates
    ? [...history].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    : [...history];

  const values = sorted.map(d => (typeof d.value === 'number' && !isNaN(d.value) ? d.value : 0));
  const steps = getHorizonSteps(horizon);
  const zScore = getZScore(confidenceLevel);

  let fitted: number[] = [];
  let futureVals: number[] = [];

  if (method === 'linear') {
    const res = runLinearRegression(values, steps);
    fitted = res.fitted;
    futureVals = res.forecasts;
  } else if (method === 'moving_average') {
    const res = runMovingAverage(values, steps);
    fitted = res.fitted;
    futureVals = res.forecasts;
  } else {
    const res = runExponentialSmoothing(values, steps);
    fitted = res.fitted;
    futureVals = res.forecasts;
  }

  const metrics = calculateMetrics(values, fitted);

  // Determine trend & growth
  const firstVal = values[0] || 1;
  const lastVal = values[values.length - 1] || 1;
  const lastForecast = futureVals[futureVals.length - 1] || lastVal;
  const growthPercentage = Math.round(((lastForecast - lastVal) / (Math.abs(lastVal) || 1)) * 1000) / 10;

  let trend: 'UPWARD' | 'DOWNWARD' | 'STABLE' = 'STABLE';
  if (growthPercentage > 2) trend = 'UPWARD';
  else if (growthPercentage < -2) trend = 'DOWNWARD';

  // Base standard error of estimate (at least 2% of mean to avoid zero width when perfect fit)
  const meanVal = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
  const standardError = Math.max(metrics.rmse, meanVal * 0.02);

  // Construct historical points
  const points: ForecastResultPoint[] = sorted.map((d, i) => {
    const fit = Math.round((fitted[i] ?? d.value) * 100) / 100;
    const margin = Math.round(zScore * standardError * 100) / 100;
    const lower = Math.max(0, Math.round((fit - margin) * 100) / 100);
    const upper = Math.round((fit + margin) * 100) / 100;

    return {
      date: d.date,
      historical: d.value,
      forecast: fit,
      lowerBound: lower,
      upperBound: upper,
      ciRange: [lower, upper],
      marginOfError: margin
    };
  });

  // Construct future projection points with widening confidence interval
  const lastDateStr = sorted[sorted.length - 1]?.date || '';
  let totalFutureMargin = 0;
  let totalFutureForecast = 0;

  for (let s = 1; s <= steps; s++) {
    const dateStr = generateNextDateString(lastDateStr, s);
    const val = futureVals[s - 1] ?? lastVal;

    // Uncertainty widens over time as forecasting horizon extends: sqrt(s) expansion
    const horizonExpansion = Math.sqrt(1 + (s / steps) * 1.5);
    const margin = Math.round(zScore * standardError * horizonExpansion * 100) / 100;
    const lower = Math.max(0, Math.round((val - margin) * 100) / 100);
    const upper = Math.round((val + margin) * 100) / 100;

    totalFutureMargin += margin;
    totalFutureForecast += val;

    points.push({
      date: dateStr,
      forecast: Math.round(val * 100) / 100,
      lowerBound: lower,
      upperBound: upper,
      ciRange: [lower, upper],
      marginOfError: margin
    });
  }

  const avgFutureVal = steps > 0 ? totalFutureForecast / steps : 0;
  const avgMargin = steps > 0 ? totalFutureMargin / steps : 0;
  const ciLowerOverall = Math.max(0, Math.round((avgFutureVal - avgMargin) * 100) / 100);
  const ciUpperOverall = Math.round((avgFutureVal + avgMargin) * 100) / 100;

  return {
    points,
    evaluation: {
      ...metrics,
      trend,
      growthPercentage,
      sampleSize: sorted.length,
      confidenceLevel,
      zScore,
      meanProjected: Math.round(avgFutureVal * 100) / 100,
      ciLower: ciLowerOverall,
      ciUpper: ciUpperOverall,
      averageMarginOfError: Math.round(avgMargin * 100) / 100
    },
    horizonSteps: steps,
    method,
    confidenceLevel
  };
}
