import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns/promises';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  runAdvancedForecastPipeline,
  compareForecastModels,
  prepareTimeSeries,
  computeTimeSeriesStats,
} from './src/utils/forecasting';
import {
  validateExternalUrl,
  isPrivateOrReservedIp,
  detectSourceFormat,
} from './src/utils/ssrfGuard';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini AI Client (Server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const GEMINI_MODEL = 'gemini-4-hydrogen';
const MAX_REMOTE_FETCH_BYTES = 25 * 1024 * 1024; // 25 MB cap
const REMOTE_FETCH_TIMEOUT_MS = 15000;

async function assertHostnameSafe(hostname: string): Promise<void> {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error(`Akses ke IP internal '${hostname}' diblokir oleh kebijakan SSRF.`);
    }
    return;
  }
  const records = await dns.lookup(hostname, { all: true });
  if (!records || records.length === 0) {
    throw new Error(`DNS tidak dapat meresolusi hostname '${hostname}'.`);
  }
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new Error(
        `Hostname '${hostname}' merujuk ke alamat IP internal/privat (${rec.address}) yang diblokir.`
      );
    }
  }
}

async function fetchExternalSafe(rawUrl: string): Promise<{
  finalUrl: string;
  buffer: Buffer;
  contentType: string;
  contentDisposition: string;
}> {
  let currentUrl = rawUrl;
  for (let hop = 0; hop <= 3; hop++) {
    const validation = validateExternalUrl(currentUrl);
    if (!validation.valid || !validation.normalizedUrl || !validation.hostname) {
      throw new Error(validation.reason || 'URL tidak valid.');
    }
    await assertHostnameSafe(validation.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(validation.normalizedUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SmartAIDataAnalyst/1.0 (+https://ai.studio)',
          Accept: '*/*',
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`Server mengembalikan redirect HTTP ${response.status} tanpa target.`);
        }
        currentUrl = new URL(location, validation.normalizedUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`Server sumber mengembalikan HTTP ${response.status} (${response.statusText}).`);
      }

      const contentLength = Number(response.headers.get('content-length') || '0');
      if (contentLength > MAX_REMOTE_FETCH_BYTES) {
        throw new Error('Ukuran file sumber melebihi batas maksimum 25 MB.');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const arrBuf = await response.arrayBuffer();
        const buf = Buffer.from(arrBuf);
        if (buf.byteLength > MAX_REMOTE_FETCH_BYTES) {
          throw new Error('Ukuran file sumber melebihi batas maksimum 25 MB.');
        }
        return {
          finalUrl: validation.normalizedUrl,
          buffer: buf,
          contentType: response.headers.get('content-type') || '',
          contentDisposition: response.headers.get('content-disposition') || '',
        };
      }

      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > MAX_REMOTE_FETCH_BYTES) {
            reader.cancel().catch(() => {});
            throw new Error('Ukuran unduhan melebihi batas maksimum 25 MB.');
          }
          chunks.push(value);
        }
      }

      return {
        finalUrl: validation.normalizedUrl,
        buffer: Buffer.concat(chunks.map(c => Buffer.from(c))),
        contentType: response.headers.get('content-type') || '',
        contentDisposition: response.headers.get('content-disposition') || '',
      };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Terlalu banyak pengalihan (redirect > 3 kali).');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// 0A. Safe URL Ingestion Proxy Endpoint (CSV / Excel / PDF / DOCX / JSON API)
app.post('/api/ingest/url', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'Parameter url wajib diisi.' });
    }

    const fetched = await fetchExternalSafe(url.trim());
    const format = detectSourceFormat(
      fetched.finalUrl,
      fetched.contentType,
      fetched.contentDisposition
    );

    let fileName = 'remote_dataset.' + format;
    const cdMatch = fetched.contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    if (cdMatch && cdMatch[1]) {
      fileName = decodeURIComponent(cdMatch[1]).replace(/[/\\]/g, '_');
    } else {
      const pathPart = new URL(fetched.finalUrl).pathname.split('/').filter(Boolean).pop();
      if (pathPart) fileName = pathPart;
    }

    return res.json({
      success: true,
      finalUrl: fetched.finalUrl,
      fileName,
      format,
      mimeType: fetched.contentType,
      byteLength: fetched.buffer.byteLength,
      base64Content: fetched.buffer.toString('base64'),
    });
  } catch (error: any) {
    const msg = error?.name === 'AbortError'
      ? 'Batas waktu unduhan dari URL terlampaui (15 detik).'
      : error?.message || 'Gagal mengunduh sumber data dari URL.';
    return res.status(400).json({ success: false, error: msg });
  }
});

// 0B. Scanned PDF OCR Endpoint using Gemini Vision (gemini-4-hydrogen)
app.post('/api/ai/ocr-pdf', async (req, res) => {
  try {
    const { fileName, pages } = req.body || {};
    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ error: 'Halaman gambar PDF diperlukan untuk OCR.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi sehingga OCR PDF tidak dapat dijalankan.',
      });
    }

    const parts: any[] = [
      {
        text: `Anda adalah engine OCR Enterprise yang mengekstrak seluruh teks dan tabel dari dokumen PDF scan bernama "${fileName || 'document.pdf'}".
Kembalikan JSON dengan format persis:
{
  "text": "seluruh teks terstruktur yang terbaca dari gambar halaman",
  "tables": [
    {
      "title": "Judul Tabel",
      "pageNumber": 1,
      "rows": [{ "Kolom1": "nilai", "Kolom2": 123 }]
    }
  ]
}
Jika tidak ada tabel, kembalikan "tables": []. Jangan mengarang angka yang tidak terbaca pada gambar.`,
      },
    ];

    for (const p of pages.slice(0, 3)) {
      if (p?.base64Png) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: String(p.base64Png),
          },
        });
      }
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OCR timeout')), 15000)
    );
    const callPromise = ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: { responseMimeType: 'application/json' },
    });

    const response: any = await Promise.race([callPromise, timeoutPromise]);
    const parsed = JSON.parse(response?.text || '{}');
    return res.json({
      success: true,
      text: parsed.text || '',
      tables: Array.isArray(parsed.tables) ? parsed.tables : [],
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Gagal menjalankan OCR pada PDF scan.',
    });
  }
});

// 1. AI Chat Endpoint (AI Data Analyst - Grounded Deterministic + Gemini)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const {
      datasetName,
      stats,
      sampleData,
      query,
      history,
      computedFacts,
      intelligenceSummary,
    } = req.body || {};

    if (!query) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const systemInstruction = `Anda adalah SENIOR AI DATA ANALYST, DATA SCIENTIST, & DECISION SUPPORT SYSTEM untuk perusahaan enterprise.
Tugas Anda adalah menganalisis data aktual dan menjawab pertanyaan pengguna dalam Bahasa Indonesia profesional.

ATURAN KETAT (ANTI-HALUSINASI):
1. JANGAN PERNAH mengarang angka, persentase, atau fakta di luar data & kalkulasi empiris yang diberikan di context.
2. Jika data tidak mencukupi (misal tidak ada kolom tanggal atau nilai kosong tinggi), nyatakan secara eksplisit dan jujur.
3. Bedakan secara jelas antara: Fakta Terukur, Korelasi Statistik (bukan kausalitas), Dugaan Penyebab, dan Langkah Uji Lanjutan.
4. Di setiap jawaban, sebutkan nama kolom/variabel, angka spesifik pendukung, serta rekomendasi bisnis konkret yang actionable.
5. Gunakan format Markdown yang rapi dengan tabel ringkas atau bullet points terstruktur.`;

    const contextPrompt = `
INFORMASI DATASET:
- Nama Dataset: ${datasetName || 'Dataset Aktif'}
- Total Baris: ${stats?.rowCount || 'N/A'}, Total Kolom: ${stats?.colCount || 'N/A'}
- Kolom Numerik: ${JSON.stringify(stats?.numericCols || [])}
- Kolom Tanggal: ${JSON.stringify(stats?.dateCols || [])}
- Kolom Kategori: ${JSON.stringify(stats?.categoricalCols || [])}

HASIL KALKULASI DETERMINISTIK UNTUK KUERI INI:
${computedFacts || 'Belum ada ringkasan lookup terhitung.'}

RINGKASAN PROFIL, KORELASI & UJI STATISTIK TERHITUNG:
${JSON.stringify(intelligenceSummary || {}, null, 2)}

STATISTIK KOLOM:
${JSON.stringify(
  stats?.columns?.map((c: any) => ({
    name: c.name,
    type: c.type,
    missingCount: c.missingCount,
    uniqueCount: c.uniqueCount,
    stats: c.stats,
  })) || []
)}

SAMPEL DATA AKTUAL (Maks 12 baris):
${JSON.stringify((sampleData || []).slice(0, 12), null, 2)}

RIWAYAT PERCAKAPAN SEBELUMNYA:
${Array.isArray(history) ? history.slice(-4).map((h: any) => `${h.role}: ${h.content}`).join('\n') : 'None'}

PERTANYAAN PENGGUNA:
${query}
`;

    let responseText = '';
    if (process.env.GEMINI_API_KEY) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), 12000)
        );
        const callPromise = ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: contextPrompt,
          config: { systemInstruction },
        });
        const response: any = await Promise.race([callPromise, timeoutPromise]);
        if (response && response.text) {
          responseText = response.text;
        }
      } catch (err: any) {
        console.warn(`Gemini chat fallback (${GEMINI_MODEL}):`, err?.message);
      }
    }

    if (!responseText) {
      responseText = `### Hasil Analisis Data Terverifikasi: ${datasetName || 'Dataset'}

${computedFacts || `Berdasarkan evaluasi terhadap **${stats?.rowCount || 0} baris** dan **${stats?.colCount || 0} kolom**.`}

#### Catatan Metodologis & Rekomendasi
- Seluruh angka di atas dihitung secara deterministik langsung dari baris aktual dataset **${datasetName || 'aktif'}**.
- Pastikan untuk membedakan korelasi antar variabel numerik dengan hubungan sebab-akibat langsung sebelum menetapkan intervensi operasional.
- Tinjau tab **Automated Insights** dan **Data Explorer** untuk melihat bukti p-value, segmentasi K-Means, serta profil anomali per baris.`;
    }

    return res.json({
      answer: responseText,
      timestamp: new Date().toISOString(),
      model: process.env.GEMINI_API_KEY && responseText ? GEMINI_MODEL : 'deterministic-analytical-engine',
    });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process AI query',
    });
  }
});

// 2. Automated Insights Enrichment Endpoint (Grounded in computed IntelligenceReport)
app.post('/api/ai/insights', async (req, res) => {
  try {
    const { datasetName, computedInsights, intelligenceSummary } = req.body || {};

    if (!Array.isArray(computedInsights)) {
      return res.status(400).json({ error: 'computedInsights array diperlukan.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        insights: computedInsights,
        source: 'deterministic-intelligence-engine',
      });
    }

    const systemInstruction = `Anda adalah Senior Strategic Data Analyst. Tugas Anda adalah memperhalus narasi dan rekomendasi tindakan dari daftar insights yang SUDAH DIHITUNG secara statistik.
ATURAN KETAT:
- DILARANG mengubah atau mengarang angka/p-value/persentase pada field statisticalEvidence & supportingValues.
- Pertahankan struktur JSON array dan semua field exact (id, title, category, finding, statisticalEvidence, supportingValues, relatedColumns, dataPeriod, sourceDataset, impactLevel, confidenceLevel, recommendedAction).`;

    const prompt = `Dataset: "${datasetName || 'Dataset'}"
Ringkasan Statistik: ${JSON.stringify(intelligenceSummary || {})}
Daftar Insight Terhitung (perhalus narasi Bahasa Indonesia & ketajaman rekomendasi tanpa mengubah angka):
${JSON.stringify(computedInsights, null, 2)}`;

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000));
      const callPromise = ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });
      const response: any = await Promise.race([callPromise, timeoutPromise]);
      const parsed = JSON.parse(response?.text || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({ insights: parsed, source: GEMINI_MODEL });
      }
    } catch {
      // Fall back cleanly to exact deterministic insights
    }

    return res.json({
      insights: computedInsights,
      source: 'deterministic-intelligence-engine',
    });
  } catch (error: any) {
    console.error('Error in /api/ai/insights:', error);
    return res.status(500).json({ error: error?.message || 'Failed to enrich insights' });
  }
});

// 3. Executive Summary Endpoint (14-Section Board Report Grounded in Deterministic Engine)
app.post('/api/ai/executive-summary', async (req, res) => {
  try {
    const { datasetName, style, deterministicReport, intelligenceSummary } = req.body || {};
    const reportStyle = style || 'Executive Management Report';

    if (!process.env.GEMINI_API_KEY || !deterministicReport) {
      return res.json({
        report: deterministicReport || 'Laporan tidak tersedia.',
        timestamp: new Date().toISOString(),
        style: reportStyle,
        model: 'deterministic-intelligence-engine',
      });
    }

    const systemInstruction = `Anda adalah Senior Executive Analyst (McKinsey/BCG partner style).
Tugas Anda menyusun Executive Summary 14 bagian dalam Bahasa Indonesia formal untuk Dewan Direksi dengan gaya "${reportStyle}".
ATURAN KETAT (ANTI-HALUSINASI):
- Gunakan HANYA angka, metrik, uji statistik, dan fakta yang ada di dalam draft deterministik & ringkasan intelijen di bawah.
- Jangan mengarang angka baru.
- Pertahankan ke-14 nomor judul bagian secara urut dan jelas.`;

    const prompt = `Dataset: "${datasetName}"
Ringkasan Statistik: ${JSON.stringify(intelligenceSummary || {})}
Draft Laporan 14 Bagian Terhitung (pertajam narasi eksekutif sesuai gaya "${reportStyle}" tanpa mengubah fakta angka):
${deterministicReport}`;

    let reportText = '';
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 12000));
      const callPromise = ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { systemInstruction },
      });
      const response: any = await Promise.race([callPromise, timeoutPromise]);
      reportText = response?.text || '';
    } catch {
      reportText = '';
    }

    return res.json({
      report: reportText || deterministicReport,
      timestamp: new Date().toISOString(),
      style: reportStyle,
      model: reportText ? GEMINI_MODEL : 'deterministic-intelligence-engine',
    });
  } catch (error: any) {
    console.error('Error in /api/ai/executive-summary:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate executive summary' });
  }
});

// 4. Deterministic Statistical Forecasting Execution Endpoint
app.post('/api/forecast/run', (req, res) => {
  try {
    const body = req.body || {};
    const {
      rows,
      dateColumn,
      targetColumn,
      categoryColumn,
      segmentValue,
      frequency,
      historicalPeriod,
      aggregation,
      method,
      horizon,
      customSteps,
      confidenceLevel,
      scenarioShockPct,
    } = body;

    if (!Array.isArray(rows)) {
      return res.status(400).json({
        success: false,
        error: 'Payload rows harus berupa array objek dataset.',
        issues: [],
      });
    }

    if (rows.length > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Jumlah baris melebihi batas maksimum 50.000 observasi per permintaan.',
        issues: [],
      });
    }

    const pipelineResult = runAdvancedForecastPipeline({
      rows,
      dateColumn: typeof dateColumn === 'string' ? dateColumn : '',
      targetColumn: typeof targetColumn === 'string' ? targetColumn : '',
      categoryColumn: typeof categoryColumn === 'string' ? categoryColumn : undefined,
      segmentValue: typeof segmentValue === 'string' ? segmentValue : undefined,
      frequency: frequency || 'auto',
      historicalPeriod: historicalPeriod || 'all',
      aggregation: aggregation || 'sum',
      method: method || 'auto',
      horizon: horizon || '30d',
      customSteps: customSteps !== undefined ? Number(customSteps) : undefined,
      confidenceLevel: confidenceLevel !== undefined ? Number(confidenceLevel) as any : 0.95,
      scenarioShockPct: scenarioShockPct !== undefined ? Number(scenarioShockPct) : 12,
    });

    if (!pipelineResult.success || !pipelineResult.result) {
      return res.status(200).json({
        success: false,
        validationError: true,
        error: pipelineResult.error || 'Dataset tidak memenuhi syarat validasi time-series.',
        issues: pipelineResult.issues,
        prepared: pipelineResult.prepared,
      });
    }

    return res.json({
      success: true,
      issues: pipelineResult.issues,
      prepared: pipelineResult.prepared,
      result: pipelineResult.result,
    });
  } catch (error: any) {
    console.error('Error in /api/forecast/run:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Terjadi kesalahan internal saat menjalankan forecasting.',
      issues: [],
    });
  }
});

// 5. Deterministic Multi-Model Benchmarking Endpoint
app.post('/api/forecast/compare', (req, res) => {
  try {
    const body = req.body || {};
    const {
      rows,
      dateColumn,
      targetColumn,
      categoryColumn,
      segmentValue,
      frequency,
      historicalPeriod,
      aggregation,
    } = body;

    if (!Array.isArray(rows) || rows.length > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Data baris tidak valid atau melebihi kapasitas.',
        issues: [],
      });
    }

    const prepared = prepareTimeSeries({
      rows,
      dateColumn: typeof dateColumn === 'string' ? dateColumn : '',
      targetColumn: typeof targetColumn === 'string' ? targetColumn : '',
      categoryColumn: typeof categoryColumn === 'string' ? categoryColumn : undefined,
      segmentValue: typeof segmentValue === 'string' ? segmentValue : undefined,
      frequency: frequency || 'auto',
      historicalPeriod: historicalPeriod || 'all',
      aggregation: aggregation || 'sum',
    });

    if (!prepared.valid) {
      return res.status(200).json({
        success: false,
        validationError: true,
        error: prepared.blockingError || 'Dataset tidak valid untuk benchmarking model.',
        issues: prepared.issues,
      });
    }

    const statistics = computeTimeSeriesStats(prepared.points, prepared.appliedFrequency);
    const comparisons = compareForecastModels(prepared.points, statistics);

    return res.json({
      success: true,
      appliedFrequency: prepared.appliedFrequency,
      statistics,
      comparisons,
      issues: prepared.issues,
    });
  } catch (error: any) {
    console.error('Error in /api/forecast/compare:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Gagal menjalankan komparasi model.',
      issues: [],
    });
  }
});

// 6. Forecast AI Strategic Interpretation & Interactive Q&A Endpoint (gemini-4-hydrogen)
app.post('/api/ai/forecast-analysis', async (req, res) => {
  try {
    const {
      datasetName,
      metricName,
      dateColumn,
      horizon,
      horizonSteps,
      appliedFrequency,
      method,
      modelName,
      confidenceLevel,
      evaluation,
      statistics,
      backtestSample,
      pointsSample,
      scenarios,
      question,
    } = req.body || {};

    if (!evaluation || !metricName) {
      return res.status(400).json({
        error: 'Data hasil evaluasi forecasting dan target variabel wajib disediakan.',
      });
    }

    const systemInstruction = `Anda adalah Senior Quantitative Data Scientist & Enterprise Decision Advisor.
Tugas Anda adalah memberikan interpretasi strategis yang terukur terhadap hasil forecasting statistik dalam Bahasa Indonesia profesional.

ATURAN KETAT (ANTI-HALUSINASI):
1. DILARANG KERAS mengarang angka, persentase, atau fakta di luar konteks statistik yang diberikan.
2. Seluruh angka yang disebut HARUS cocok persis dengan objek evaluation, statistics, scenarios, backtestSample, dan pointsSample.
3. Jika sebuah metrik bernilai null/tidak tersedia (misalnya MAPE saat terdapat nilai aktual 0), jelaskan secara jujur dan rujuk sMAPE/RMSE sebagai pengganti.
4. Bedakan antara proyeksi statistik sentral, rentang ketidakpastian Confidence Interval (80% & 95%), dan simulasi skenario (Optimistic/Baseline/Pessimistic).
5. Susun jawaban WAJIB dengan 8 bagian berurutan persis seperti format berikut:
### 1. Forecast Overview
### 2. Trend Interpretation
### 3. Statistical Findings
### 4. Model Performance
### 5. Risk Analysis
### 6. Prediction Uncertainty
### 7. Business Implications
### 8. Recommended Actions
${question ? '\nTambahkan bagian khusus di awal bernama **### Jawaban Pertanyaan Spesifik Pengguna** yang menjawab pertanyaan pengguna secara langsung berdasarkan angka aktual sebelum 8 bagian di atas.' : ''}`;

    const contextPrompt = `
KONTEKS FORECASTING TERHITUNG:
- Dataset: ${datasetName || 'Dataset Aktif'}
- Variabel Target: ${metricName} | Kolom Waktu: ${dateColumn || '-'} | Frekuensi: ${appliedFrequency || '-'}
- Model Terpilih: ${modelName || method} (${method})
- Alasan Pemilihan Model: ${evaluation?.selectionReason || '-'}
- Parameter Model: ${JSON.stringify(evaluation?.modelParameters || {})}
- Horizon: ${horizon} (${horizonSteps || '-'} langkah) | Tingkat Kepercayaan: ${confidenceLevel || '95% CI'}

RINGKASAN STATISTIK HISTORIS:
${JSON.stringify(statistics || {}, null, 2)}

EVALUASI & BACKTESTING (TIME-SERIES SPLIT):
${JSON.stringify(evaluation || {}, null, 2)}

SAMPEL BACKTESTING AKTUAL VS PREDIKSI:
${JSON.stringify(backtestSample || [], null, 2)}

SAMPEL TITIK PROYEKSI MASA DEPAN:
${JSON.stringify(pointsSample || [], null, 2)}

ANALISIS SKENARIO:
${JSON.stringify(scenarios ? {
  shockPercentage: scenarios.shockPercentage,
  optimisticFinal: scenarios.optimisticFinal,
  baselineFinal: scenarios.baselineFinal,
  pessimisticFinal: scenarios.pessimisticFinal,
  optimisticMean: scenarios.optimisticMean,
  baselineMean: scenarios.baselineMean,
  pessimisticMean: scenarios.pessimisticMean,
} : {}, null, 2)}

${question ? `PERTANYAAN SPESIFIK PENGGUNA: "${question}"` : 'Berikan interpretasi menyeluruh 8 bagian secara padat, objektif, dan actionable.'}
`;

    let analysisText = '';
    if (process.env.GEMINI_API_KEY) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 12000));
        const callPromise = ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: contextPrompt,
          config: {
            systemInstruction,
          },
        });
        const response: any = await Promise.race([callPromise, timeoutPromise]);
        analysisText = response?.text || '';
      } catch (err: any) {
        console.warn('Gemini forecast analysis fallback triggered:', err?.message);
      }
    }

    if (!analysisText) {
      const mapeLabel = evaluation?.mapeAvailable ? `${evaluation.mape}%` : `N/A (menggunakan sMAPE ${evaluation?.smape ?? 0}%)`;
      const fmt = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString('id-ID') : '-');
      const outlierCount = Array.isArray(statistics?.outliers) ? statistics.outliers.length : 0;
      const changePointCount = Array.isArray(statistics?.changePoints) ? statistics.changePoints.length : 0;

      const qaBlock = question
        ? `### Jawaban Pertanyaan Spesifik Pengguna\nMenanggapi pertanyaan *"${question}"*: Berdasarkan model **${modelName || method}** untuk variabel **${metricName}**, nilai rata-rata proyeksi adalah **${fmt(evaluation?.meanProjected)}** dengan tren **${evaluation?.trend}** (${evaluation?.growthPercentage >= 0 ? '+' : ''}${evaluation?.growthPercentage}%), rentang 95% CI **[${fmt(evaluation?.ci95Lower)} s/d ${fmt(evaluation?.ci95Upper)}]**, serta akurasi out-of-sample RMSE **${fmt(evaluation?.rmse)}** dan sMAPE **${evaluation?.smape ?? 0}%**.\n\n`
        : '';

      analysisText = `${qaBlock}### 1. Forecast Overview
Peramalan dilakukan terhadap **${metricName}** pada dataset **${datasetName || 'Dataset Aktif'}** menggunakan **${modelName || method}** untuk horizon **${horizonSteps || horizon} langkah** (${appliedFrequency || 'periodik'}). Nilai proyeksi rata-rata mencapai **${fmt(evaluation?.meanProjected)}** dengan arah tren **${evaluation?.trend}**.

### 2. Trend Interpretation
Secara historis (${statistics?.count ?? evaluation?.sampleSize ?? 0} periode), data mencatatkan perubahan kumulatif **${statistics?.percentageChange ?? 0}%** dengan rata-rata pertumbuhan per periode **${statistics?.growthRate ?? 0}%**. Ke depan, model memproyeksikan perubahan **${evaluation?.growthPercentage >= 0 ? '+' : ''}${evaluation?.growthPercentage}%** dari titik observasi terakhir.

### 3. Statistical Findings
- **Rata-rata & Median Historis:** Mean **${fmt(statistics?.mean)}**, Median **${fmt(statistics?.median)}** (Min: **${fmt(statistics?.min)}**, Max: **${fmt(statistics?.max)}**).
- **Dispersi & Volatilitas:** StdDev **${fmt(statistics?.stdDev)}** dengan Koefisien Variasi (CV) **${statistics?.cv ?? 0}%**.
- **Pola Musiman & Anomali:** ${statistics?.seasonalityDetected ? `Siklus musiman terdeteksi setiap ${statistics.seasonalPeriod} periode.` : 'Tidak ditemukan siklus musiman dominan.'} Terdeteksi **${outlierCount} outlier (IQR)** dan **${changePointCount} change point**.

### 4. Model Performance
- **Status Validasi:** \`${evaluation?.validationStatus}\` (${evaluation?.validationNote || '-'})
- **Periode Train / Test:** ${evaluation?.trainingPeriod} (${evaluation?.trainCount} titik) vs ${evaluation?.testingPeriod} (${evaluation?.testCount} titik)
- **Metrik Error:** MAE = **${fmt(evaluation?.mae)}**, RMSE = **${fmt(evaluation?.rmse)}**, MAPE = **${mapeLabel}**, sMAPE = **${evaluation?.smape ?? 0}%**, R² = **${evaluation?.r2 ?? 0}**.

### 5. Risk Analysis
Dengan CV historis **${statistics?.cv ?? 0}%** dan deviasi error backtesting RMSE **${fmt(evaluation?.rmse)}**, risiko utama terletak pada volatilitas jangka menengah serta kemungkinan pergeseran struktural apabila horizon melebihi panjang data historis. Dalam simulasi skenario pesimistis (-${scenarios?.shockPercentage ?? 12}% shock), nilai akhir berada di **${fmt(scenarios?.pessimisticFinal)}**.

### 6. Prediction Uncertainty
- **80% Confidence Interval (Rata-rata):** [${fmt(evaluation?.ci80Lower)} s/d ${fmt(evaluation?.ci80Upper)}]
- **95% Confidence Interval (Rata-rata):** [${fmt(evaluation?.ci95Lower)} s/d ${fmt(evaluation?.ci95Upper)}]
- *Catatan:* Prediction interval melebar seiring bertambahnya langkah waktu dan merepresentasikan estimasi ketidakpastian statistik berdasarkan residual historis, bukan jaminan kepastian absolut.

### 7. Business Implications
Rentang baseline (**${fmt(scenarios?.baselineFinal)}** di akhir horizon) vs optimis (**${fmt(scenarios?.optimisticFinal)}**) dan pesimis (**${fmt(scenarios?.pessimisticFinal)}**) memberikan koridor perencanaan anggaran, kapasitas operasional, dan manajemen inventori yang terkuantifikasi risiko.

### 8. Recommended Actions
1. **Rencanakan Kapasitas Berbasis 80% CI:** Gunakan koridor [${fmt(evaluation?.ci80Lower)} – ${fmt(evaluation?.ci80Upper)}] sebagai target operasi normal.
2. **Siapkan Kontinjensi Batas Bawah 95% CI:** Tetapkan rencana mitigasi biaya apabila realisasi aktual turun mendekati **${fmt(evaluation?.ci95Lower)}**.
3. **Evaluasi Rolling Periodik:** Bandingkan nilai aktual baru terhadap backtest error (MAE **${fmt(evaluation?.mae)}**) setiap siklus ${appliedFrequency || 'berikutnya'} dan kalibrasi ulang model bila terjadi deviasi > 2×RMSE.`;
    }

    return res.json({
      analysis: analysisText,
      model: process.env.GEMINI_API_KEY ? 'gemini-4-hydrogen' : 'statistical-deterministic-engine',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/ai/forecast-analysis:', error);
    return res.status(500).json({ error: error?.message || 'Failed to analyze forecast' });
  }
});

// Setup Vite dev server or serve production dist
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMART AI Data Analyst Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
