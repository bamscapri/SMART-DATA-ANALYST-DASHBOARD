export interface DocumentTableExtracted {
  id: string;
  title: string;
  pageNumber?: number;
  sheetName?: string;
  rowCount: number;
  colCount: number;
  columns: string[];
  rows: Record<string, any>[];
}

export interface DocumentSectionExtracted {
  heading: string;
  level: number;
  pageNumber?: number;
  content: string;
}

export interface DocumentIntelligencePayload {
  isDocumentDominant: boolean;
  pageCount: number;
  wordCount: number;
  paragraphCount: number;
  headingCount: number;
  tableCount: number;
  isScannedPdf?: boolean;
  ocrApplied?: boolean;
  formulasDetected?: number;
  formulaExamples?: string[];
  headings: string[];
  sections: DocumentSectionExtracted[];
  extractedTables: DocumentTableExtracted[];
  rawTextPreview: string;
  fullText?: string;
}

export interface LineageStep {
  id: string;
  timestamp: string;
  stage:
    | 'INGESTION'
    | 'EXTRACTION'
    | 'PROFILING'
    | 'CLEANING'
    | 'TRANSFORMATION'
    | 'ANALYSIS'
    | 'STATISTICAL'
    | 'MINING'
    | 'FORECASTING'
    | 'REPORTING';
  action: string;
  details: string;
  userName?: string;
  inputRows?: number;
  outputRows?: number;
  sourceRef?: string;
}

export interface DatasetSourceMeta {
  sourceType: 'file' | 'url' | 'merged' | 'cleaned' | 'transformed' | 'seed';
  sourceUrl?: string;
  mimeType?: string;
  extractedAt: string;
  sheetCount?: number;
  originalFiles?: string[];
  provenanceNote?: string;
}

export interface StoredDataset {
  id: string;
  name: string;
  description: string;
  fileName: string;
  fileType: 'csv' | 'xlsx' | 'pdf' | 'docx' | 'json';
  fileSize: number;
  uploadedAt: string;
  data: Record<string, any>[];
  sheets?: { name: string; data: Record<string, any>[]; columns?: string[] }[];
  activeSheet?: string;
  isCleaned?: boolean;
  originalId?: string;
  analysisMode?: 'structured' | 'document';
  sourceMeta?: DatasetSourceMeta;
  documentContent?: DocumentIntelligencePayload;
  lineage?: LineageStep[];
}

export const SEED_DATASETS: StoredDataset[] = [
  {
    id: 'ds_retail_2024',
    name: 'Nusantara Retail - Multi-Region Sales & Profitability',
    description: 'Catatan komprehensif transaksi penjualan retail seluruh Indonesia meliputi revenue, profit margin, kategori barang, dan channel pemasaran periode 2024-2025.',
    fileName: 'nusantara_retail_sales_2024.xlsx',
    fileType: 'xlsx',
    fileSize: 452000,
    uploadedAt: '2025-01-15T08:30:00Z',
    activeSheet: 'Transactions_2024',
    sheets: [
      {
        name: 'Transactions_2024',
        data: [
          { Order_ID: 'ORD-1001', Date: '2024-01-05', Region: 'Jabodetabek', Category: 'Electronics', Product: 'Smart TV 55-inch 4K', Units: 12, Unit_Price: 6500000, Revenue: 78000000, Cost: 58500000, Profit: 19500000, Discount_Pct: 5, Channel: 'E-Commerce', Customer_Segment: 'Corporate' },
          { Order_ID: 'ORD-1002', Date: '2024-01-12', Region: 'Jawa Timur', Category: 'Furniture', Product: 'Ergonomic Desk Pro', Units: 25, Unit_Price: 2800000, Revenue: 70000000, Cost: 49000000, Profit: 21000000, Discount_Pct: 10, Channel: 'Direct Store', Customer_Segment: 'SME' },
          { Order_ID: 'ORD-1003', Date: '2024-01-19', Region: 'Sumatera Utara', Category: 'IT Hardware', Product: 'Server Rack 24U', Units: 4, Unit_Price: 14500000, Revenue: 58000000, Cost: 43500000, Profit: 14500000, Discount_Pct: 0, Channel: 'B2B Portal', Customer_Segment: 'Enterprise' },
          { Order_ID: 'ORD-1004', Date: '2024-02-02', Region: 'Jabodetabek', Category: 'Electronics', Product: 'Wireless ANC Headphone', Units: 80, Unit_Price: 1200000, Revenue: 96000000, Cost: 67200000, Profit: 28800000, Discount_Pct: 8, Channel: 'E-Commerce', Customer_Segment: 'Retail' },
          { Order_ID: 'ORD-1005', Date: '2024-02-14', Region: 'Bali & Nusa', Category: 'Hospitality Supplies', Product: 'Commercial Espresso Mach.', Units: 8, Unit_Price: 18000000, Revenue: 144000000, Cost: 108000000, Profit: 36000000, Discount_Pct: 5, Channel: 'Direct Store', Customer_Segment: 'Enterprise' },
          { Order_ID: 'ORD-1006', Date: '2024-02-25', Region: 'Jawa Barat', Category: 'Furniture', Product: 'Executive Leather Chair', Units: 45, Unit_Price: 2200000, Revenue: 99000000, Cost: 71280000, Profit: 27720000, Discount_Pct: 10, Channel: 'Direct Store', Customer_Segment: 'Corporate' },
          { Order_ID: 'ORD-1007', Date: '2024-03-08', Region: 'Kalimantan Timur', Category: 'IT Hardware', Product: 'Enterprise Router X10', Units: 15, Unit_Price: 8500000, Revenue: 127500000, Cost: 95625000, Profit: 31875000, Discount_Pct: 0, Channel: 'B2B Portal', Customer_Segment: 'Corporate' },
          { Order_ID: 'ORD-1008', Date: '2024-03-20', Region: 'Jabodetabek', Category: 'Electronics', Product: 'Ultra-wide Monitor 34"', Units: 35, Unit_Price: 5200000, Revenue: 182000000, Cost: 136500000, Profit: 45500000, Discount_Pct: 7, Channel: 'E-Commerce', Customer_Segment: 'Corporate' },
          { Order_ID: 'ORD-1009', Date: '2024-04-05', Region: 'Sulawesi Selatan', Category: 'IT Hardware', Product: 'Mesh Wi-Fi 6 System', Units: 60, Unit_Price: 2100000, Revenue: 126000000, Cost: 94500000, Profit: 31500000, Discount_Pct: 5, Channel: 'E-Commerce', Customer_Segment: 'Retail' },
          { Order_ID: 'ORD-1010', Date: '2024-04-18', Region: 'Jawa Tengah', Category: 'Furniture', Product: 'Modular Meeting Table', Units: 14, Unit_Price: 7500000, Revenue: 105000000, Cost: 78750000, Profit: 26250000, Discount_Pct: 12, Channel: 'Direct Store', Customer_Segment: 'Corporate' },
          { Order_ID: 'ORD-1011', Date: '2024-05-02', Region: 'Jabodetabek', Category: 'Electronics', Product: 'Smart Projector 4K', Units: 20, Unit_Price: 9200000, Revenue: 184000000, Cost: 138000000, Profit: 46000000, Discount_Pct: 5, Channel: 'B2B Portal', Customer_Segment: 'Enterprise' },
          { Order_ID: 'ORD-1012', Date: '2024-05-19', Region: 'Jawa Timur', Category: 'IT Hardware', Product: 'NAS Storage 4-Bay', Units: 28, Unit_Price: 6200000, Revenue: 173600000, Cost: 130200000, Profit: 43400000, Discount_Pct: 6, Channel: 'E-Commerce', Customer_Segment: 'SME' },
          { Order_ID: 'ORD-1013', Date: '2024-06-04', Region: 'Bali & Nusa', Category: 'Furniture', Product: 'Outdoor Lounge Sofa Set', Units: 16, Unit_Price: 8900000, Revenue: 142400000, Cost: 106800000, Profit: 35600000, Discount_Pct: 8, Channel: 'Direct Store', Customer_Segment: 'Corporate' },
          { Order_ID: 'ORD-1014', Date: '2024-06-22', Region: 'Sumatera Utara', Category: 'Electronics', Product: 'Smart TV 55-inch 4K', Units: 22, Unit_Price: 6500000, Revenue: 143000000, Cost: 107250000, Profit: 35750000, Discount_Pct: 5, Channel: 'E-Commerce', Customer_Segment: 'Retail' },
          { Order_ID: 'ORD-1015', Date: '2024-07-10', Region: 'Jabodetabek', Category: 'IT Hardware', Product: 'Server Rack 24U', Units: 10, Unit_Price: 14500000, Revenue: 145000000, Cost: 108750000, Profit: 36250000, Discount_Pct: 0, Channel: 'B2B Portal', Customer_Segment: 'Enterprise' },
          { Order_ID: 'ORD-1016', Date: '2024-07-28', Region: 'Jawa Barat', Category: 'Electronics', Product: 'Wireless ANC Headphone', Units: 110, Unit_Price: 1200000, Revenue: 132000000, Cost: 92400000, Profit: 39600000, Discount_Pct: 10, Channel: 'E-Commerce', Customer_Segment: 'Retail' },
          { Order_ID: 'ORD-1017', Date: '2024-08-15', Region: 'Kalimantan Timur', Category: 'Furniture', Product: 'Ergonomic Desk Pro', Units: 40, Unit_Price: 2800000, Revenue: 112000000, Cost: 78400000, Profit: 33600000, Discount_Pct: 5, Channel: 'Direct Store', Customer_Segment: 'Corporate' },
          { Order_ID: 'ORD-1018', Date: '2024-08-30', Region: 'Jabodetabek', Category: 'Electronics', Product: 'Ultra-wide Monitor 34"', Units: 42, Unit_Price: 5200000, Revenue: 218400000, Cost: 163800000, Profit: 54600000, Discount_Pct: 8, Channel: 'E-Commerce', Customer_Segment: 'Corporate' },
          { Order_ID: 'ORD-1019', Date: '2024-09-12', Region: 'Jawa Timur', Category: 'Hospitality Supplies', Product: 'Commercial Espresso Mach.', Units: 12, Unit_Price: 18000000, Revenue: 216000000, Cost: 162000000, Profit: 54000000, Discount_Pct: 6, Channel: 'Direct Store', Customer_Segment: 'Enterprise' },
          { Order_ID: 'ORD-1020', Date: '2024-09-27', Region: 'Sulawesi Selatan', Category: 'IT Hardware', Product: 'Enterprise Router X10', Units: 25, Unit_Price: 8500000, Revenue: 212500000, Cost: 159375000, Profit: 53125000, Discount_Pct: 4, Channel: 'B2B Portal', Customer_Segment: 'Corporate' },
          { Order_ID: 'ORD-1021', Date: '2024-10-10', Region: 'Jabodetabek', Category: 'Electronics', Product: 'Smart Projector 4K', Units: 30, Unit_Price: 9200000, Revenue: 276000000, Cost: 207000000, Profit: 69000000, Discount_Pct: 5, Channel: 'B2B Portal', Customer_Segment: 'Enterprise' },
          { Order_ID: 'ORD-1022', Date: '2024-10-25', Region: 'Jawa Tengah', Category: 'Furniture', Product: 'Executive Leather Chair', Units: 70, Unit_Price: 2200000, Revenue: 154000000, Cost: 110880000, Profit: 43120000, Discount_Pct: 10, Channel: 'Direct Store', Customer_Segment: 'Corporate' },
          { Order_ID: 'ORD-1023', Date: '2024-11-14', Region: 'Jabodetabek', Category: 'IT Hardware', Product: 'NAS Storage 4-Bay', Units: 45, Unit_Price: 6200000, Revenue: 279000000, Cost: 209250000, Profit: 69750000, Discount_Pct: 5, Channel: 'E-Commerce', Customer_Segment: 'SME' },
          { Order_ID: 'ORD-1024', Date: '2024-11-28', Region: 'Jawa Timur', Category: 'Electronics', Product: 'Ultra-wide Monitor 34"', Units: 55, Unit_Price: 5200000, Revenue: 286000000, Cost: 214500000, Profit: 71500000, Discount_Pct: 8, Channel: 'E-Commerce', Customer_Segment: 'Corporate' },
          { Order_ID: 'ORD-1025', Date: '2024-12-10', Region: 'Jabodetabek', Category: 'Electronics', Product: 'Smart TV 55-inch 4K', Units: 48, Unit_Price: 6500000, Revenue: 312000000, Cost: 234000000, Profit: 78000000, Discount_Pct: 10, Channel: 'E-Commerce', Customer_Segment: 'Retail' },
          { Order_ID: 'ORD-1026', Date: '2024-12-24', Region: 'Bali & Nusa', Category: 'Hospitality Supplies', Product: 'Commercial Espresso Mach.', Units: 18, Unit_Price: 18000000, Revenue: 324000000, Cost: 243000000, Profit: 81000000, Discount_Pct: 5, Channel: 'Direct Store', Customer_Segment: 'Enterprise' }
        ]
      },
      {
        name: 'Regional_Summary',
        data: [
          { Region: 'Jabodetabek', Total_Revenue: 1293400000, Total_Profit: 352850000, Transactions: 9 },
          { Region: 'Jawa Timur', Total_Revenue: 745600000, Total_Profit: 189900000, Transactions: 4 },
          { Region: 'Bali & Nusa', Total_Revenue: 610400000, Total_Profit: 152600000, Transactions: 3 },
          { Region: 'Jawa Barat', Total_Revenue: 231000000, Total_Profit: 67320000, Transactions: 2 },
          { Region: 'Kalimantan Timur', Total_Revenue: 239500000, Total_Profit: 65475000, Transactions: 2 },
          { Region: 'Sulawesi Selatan', Total_Revenue: 338500000, Total_Profit: 84625000, Transactions: 2 },
          { Region: 'Jawa Tengah', Total_Revenue: 259000000, Total_Profit: 69370000, Transactions: 2 },
          { Region: 'Sumatera Utara', Total_Revenue: 201000000, Total_Profit: 50250000, Transactions: 2 }
        ]
      }
    ],
    data: [] // Populated below from sheet 0
  },
  {
    id: 'ds_saas_metrics',
    name: 'CloudSync SaaS Platform - MRR & Retention Analytics',
    description: 'Data pertumbuhan Monthly Recurring Revenue (MRR), Churn Rate, Customer Acquisition Cost (CAC), dan LTV pengguna CloudSync SaaS periode 2024.',
    fileName: 'saas_growth_metrics_2024.csv',
    fileType: 'csv',
    fileSize: 84000,
    uploadedAt: '2025-01-20T10:15:00Z',
    data: [
      { Month: '2024-01-01', Active_Users: 4200, MRR: 125000000, New_ARR: 18000000, Churn_Rate: 2.1, Expansion_MRR: 8500000, CAC: 450000, LTV: 8200000, NPS_Score: 68 },
      { Month: '2024-02-01', Active_Users: 4550, MRR: 136500000, New_ARR: 22000000, Churn_Rate: 1.9, Expansion_MRR: 9800000, CAC: 440000, LTV: 8500000, NPS_Score: 70 },
      { Month: '2024-03-01', Active_Users: 4980, MRR: 149400000, New_ARR: 25500000, Churn_Rate: 1.8, Expansion_MRR: 11200000, CAC: 425000, LTV: 8900000, NPS_Score: 72 },
      { Month: '2024-04-01', Active_Users: 5350, MRR: 160500000, New_ARR: 27000000, Churn_Rate: 1.7, Expansion_MRR: 12800000, CAC: 410000, LTV: 9200000, NPS_Score: 74 },
      { Month: '2024-05-01', Active_Users: 5820, MRR: 174600000, New_ARR: 31000000, Churn_Rate: 1.6, Expansion_MRR: 14500000, CAC: 395000, LTV: 9600000, NPS_Score: 75 },
      { Month: '2024-06-01', Active_Users: 6350, MRR: 190500000, New_ARR: 34500000, Churn_Rate: 1.5, Expansion_MRR: 16200000, CAC: 390000, LTV: 9900000, NPS_Score: 77 },
      { Month: '2024-07-01', Active_Users: 6900, MRR: 207000000, New_ARR: 38000000, Churn_Rate: 1.4, Expansion_MRR: 18000000, CAC: 380000, LTV: 10400000, NPS_Score: 78 },
      { Month: '2024-08-01', Active_Users: 7520, MRR: 225600000, New_ARR: 42000000, Churn_Rate: 1.3, Expansion_MRR: 20500000, CAC: 375000, LTV: 10800000, NPS_Score: 80 },
      { Month: '2024-09-01', Active_Users: 8180, MRR: 245400000, New_ARR: 45000000, Churn_Rate: 1.3, Expansion_MRR: 22800000, CAC: 360000, LTV: 11200000, NPS_Score: 81 },
      { Month: '2024-10-01', Active_Users: 8900, MRR: 267000000, New_ARR: 49500000, Churn_Rate: 1.2, Expansion_MRR: 25000000, CAC: 350000, LTV: 11600000, NPS_Score: 82 },
      { Month: '2024-11-01', Active_Users: 9750, MRR: 292500000, New_ARR: 54000000, Churn_Rate: 1.1, Expansion_MRR: 28500000, CAC: 340000, LTV: 12100000, NPS_Score: 84 },
      { Month: '2024-12-01', Active_Users: 10800, MRR: 324000000, New_ARR: 61000000, Churn_Rate: 1.0, Expansion_MRR: 32000000, CAC: 330000, LTV: 12700000, NPS_Score: 85 }
    ]
  }
];

// Initialize primary data arrays
SEED_DATASETS[0].data = SEED_DATASETS[0].sheets![0].data;
