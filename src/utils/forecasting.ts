export type ForecastMethod = 'linear' | 'moving_average' | 'exponential_smoothing';
export type ForecastHorizon = '7d' | '30d' | '3m' | '6m' | '12m';

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
}

export interface ForecastEvaluation {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
  trend: 'UPWARD' | 'DOWNWARD' | 'STABLE';
  growthPercentage: number;
  sampleSize: number;
}

export interface ForecastOutput {
  points: ForecastResultPoint[];
  evaluation: ForecastEvaluation;
  horizonSteps: number;
  method: ForecastMethod;
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
 * Simple Exponential Smoothing (Holt-like alpha weighting)
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
  // Calculate approximate drift/trend
  const drift = (values[n - 1] - values[0]) / Math.max(1, n);
  const forecasts: number[] = [];
  for (let s = 1; s <= steps; s++) {
    forecasts.push(Math.max(0, lastFitted + drift * s));
  }

  return { fitted, forecasts };
}

/**
 * Main forecasting pipeline with confidence interval calculation
 */
export function generateForecast(
  history: DataPoint[],
  method: ForecastMethod,
  horizon: ForecastHorizon
): ForecastOutput {
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const values = sorted.map(d => d.value);
  const steps = getHorizonSteps(horizon);

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

  // Construct timeline points
  const points: ForecastResultPoint[] = sorted.map((d, i) => ({
    date: d.date,
    historical: d.value,
    forecast: Math.round(fitted[i] * 100) / 100,
    lowerBound: Math.max(0, Math.round((fitted[i] - 1.96 * metrics.rmse) * 100) / 100),
    upperBound: Math.round((fitted[i] + 1.96 * metrics.rmse) * 100) / 100
  }));

  // Generate future dates
  const lastDate = new Date(sorted[sorted.length - 1]?.date || Date.now());
  for (let s = 1; s <= steps; s++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(lastDate.getDate() + s);
    const dateStr = futureDate.toISOString().split('T')[0];
    const val = futureVals[s - 1];

    // Uncertainty widens over time
    const uncertaintyFactor = 1 + (s / steps) * 0.5;
    const margin = 1.96 * metrics.rmse * uncertaintyFactor;

    points.push({
      date: dateStr,
      forecast: Math.round(val * 100) / 100,
      lowerBound: Math.max(0, Math.round((val - margin) * 100) / 100),
      upperBound: Math.round((val + margin) * 100) / 100
    });
  }

  return {
    points,
    evaluation: {
      ...metrics,
      trend,
      growthPercentage,
      sampleSize: sorted.length
    },
    horizonSteps: steps,
    method
  };
}
