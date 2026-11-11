# SMART AI DATA ANALYST DASHBOARD
## Enterprise AI-Powered Data Analytics & Decision Support System

Platform analisis data korporat berbasis kecerdasan buatan (Artificial Intelligence) dengan **Google Gemini API**, **Supabase PostgreSQL & Row Level Security (RLS)**, time-series forecasting, automated multi-format document extraction, dan interactive executive decision support.

---

## 🚀 Fitur Unggulan

1. **Dashboard Eksekutif Enterprise (Overview BI)**:
   - 4 KPI utama: Total Dataset, Dokumen Terkelola, Variabel Analitik, dan Status Akses RBAC.
   - Grafik tren data aktual adaptif & grafik aktivitas kueri pengguna mingguan.
   - Ringkasan statistik kolom otomatis (Mean, Median, StdDev, Min, Max, Missing, Outliers).

2. **Ekstraksi Multi-Format Dokumen**:
   - **Excel (.xlsx, .xls)**: Dukungan multi-sheets dengan pemilihan sheet interaktif.
   - **CSV (.csv)**: Deteksi delimiter otomatis dan inferensi tipe data dinamis.
   - **PDF (.pdf)**: Ekstraksi teks struktural dan konversi baris data.
   - **Word (.docx)**: Ekstraksi tabel HTML dan konten dokumen via Mammoth parser.

3. **AI Data Analyst (Google Gemini 3.8 Flash)**:
   - Antarmuka chat AI interaktif dalam Bahasa Indonesia profesional.
   - Komputasi statistik real-time berbasis data aktual tanpa halusinasi.
   - Rekomendasi manajerial konkret dan pemisahan tegas antara korelasi vs sebab-akibat.

4. **Automated Data Insights Engine**:
   - Ekstraksi 6 kategori insight: Key Findings, Positive Trends, Negative Trends, Anomalies, Opportunities, dan Operational Risks.
   - Label prioritas: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.

5. **Statistical Forecasting & ML Prediction**:
   - Model peramalan: Linear Regression, Moving Average, Exponential Smoothing.
   - Proyeksi horizon waktu: 7 hari, 30 hari, 3 bulan, 6 bulan, 12 bulan.
   - Selang kepercayaan 95% (Confidence Interval bounds) & metrik evaluasi model (MAE, RMSE, MAPE, R²).
   - Interpretasi manajerial strategis bertenaga AI.

6. **Modul Pembersihan Data (Data Cleaning & Normalization)**:
   - Penanganan missing value: drop row, mean imputation, median imputation, custom fill.
   - Deduplikasi baris instan.
   - Penanganan outlier IQR: cap bounds ke batas normal atau drop row.
   - Audit trail perubahan dan penyimpanan data bersih terpisah (non-destructive).

7. **Executive Summary & Board Report Generator**:
   - Laporan standar Dewan Direksi dengan 10 struktur analitik formal.
   - Ekspor PDF siap presentasi, Excel (.xlsx), CSV, dan tangkapan grafik PNG retina.

8. **Keamanan & Kontrol Akses (Admin & Analyst RBAC)**:
   - Row Level Security (RLS) PostgreSQL untuk isolasi total data antar pengguna.
   - Perlindungan 100% server-side Gemini API key (tidak pernah terekspos ke browser).

---

## 🛠️ Arsitektur Teknologi

- **Frontend**: React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: Node.js & Express (`server.ts`) dengan proxy endpoint `/api/ai/*`.
- **AI Engine**: `@google/genai` (Model `gemini-3.8-flash`).
- **Database & Storage**: Supabase PostgreSQL dengan RLS Policies & Private Storage Bucket.
- **Parsing Libraries**: SheetJS (`xlsx`), PapaParse (`papaparse`), Mammoth (`mammoth`), jsPDF, html2canvas.

---

## ⚙️ Panduan Instalasi & Menjalankan Lokal

### 1. Kloning dan Instal Dependensi
```bash
npm install
```

### 2. Konfigurasi Environment Variables
Salin file `.env.example` ke `.env`:
```env
GEMINI_API_KEY="AIzaSy..."
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
```

*(Catatan: Jika Supabase belum dikonfigurasi, sistem secara otomatis mengaktifkan Local Persistence Store sehingga seluruh 16 fitur tetap dapat digunakan 100% out-of-the-box).*

### 3. Migrasi Database Supabase (Opsional)
Jalankan file SQL migration di Supabase SQL Editor:
```sql
-- Lokasi file migration:
supabase/migrations/20250101000000_initial_schema.sql
```

### 4. Menjalankan Aplikasi
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.
