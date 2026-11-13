import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Download a CSV file
 */
export function exportToCsv(data: Record<string, any>[], filename: string = 'export_data.csv') {
  if (!data || data.length === 0) return;
  const csv = Papa.unparse(data);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download an Excel (.xlsx) file
 */
export function exportToExcel(data: Record<string, any>[], sheetName: string = 'Dataset', filename: string = 'export_data.xlsx') {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Capture an HTML Element (e.g. chart or report container) and download as PNG
 */
export async function exportElementAsPng(elementId: string, filename: string = 'chart_export.png') {
  const element = document.getElementById(elementId);
  if (!element) return;

  const computedBg =
    getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#FFFDF9';

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: computedBg,
    logging: false,
    useCORS: true
  });

  const image = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = image;
  link.click();
}

/**
 * Generates an Executive PDF Report with embedded styling and sections
 */
export async function exportExecutivePdf(elementId: string, reportTitle: string = 'SMART_AI_Executive_Report') {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210;
  const pageHeight = 295;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
