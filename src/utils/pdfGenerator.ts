import jsPDF from 'jspdf';
import { format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, parseCurrencyString } from './currency';
import { calculateAdimplentesCount } from './memberCalculations';

interface MonthlyStats {
  id: string;
  month_start_date: string;
  adimplentes_count: number;
  created_at: string;
}

interface ChartImage {
  id: string; // e.g., 'revenuePerContractChart', 'planTypeChart'
  dataUrl: string; // Base64 image data
}

interface PdfGeneratorOptions {
  members: any[];
  receivablesData: any[];
  monthlyStats: MonthlyStats[];
  prospectsData: any[];
  chartImages: ChartImage[]; // New: Array of chart images
}

export const generateDashboardPdf = async ({
  members,
  receivablesData,
  monthlyStats,
  prospectsData,
  chartImages, // New: Receive chart images
}: PdfGeneratorOptions) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  let y = 10; // Initial Y position for content

  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const lineHeight = 7; // Standard line height
  const sectionSpacing = 10; // Spacing between major sections/charts

  // Colors
  const primaryColor = '#00bcd4'; // Accent Turquoise
  const secondaryColor = '#C0C0C0'; // Accent Silver
  const textColor = '#f1f1f1'; // Text Color
  const mutedTextColor = '#6c757d'; // Pending Color (used for muted text)
  const lightGray = '#1e1e1e'; // Card Background

  // Helper for adding header and footer
  const addHeaderAndFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(10);
    doc.setTextColor(mutedTextColor);
    doc.text("DarkS Gym Analytics Report", margin, 10);
    doc.text(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR }), pageWidth - margin, 10, { align: 'right' });
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  // Helper to check if new page is needed
  const checkNewPage = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      doc.addPage();
      y = margin + 10; // Reset Y for new page content
    }
  };

  // Helper to get a friendly title from chart.id
  const getFriendlyTitle = (id: string) => {
    switch (id) {
      case 'keyMetrics': return 'Métricas Chave do Dashboard';
      case 'monthlyAdherenceTracker': return 'Adesão Mensal de Alunos';
      case 'prospectsDashboard': return 'Oportunidades e Conversão de Prospects';
      case 'overviewMetricCards': return 'Métricas Adicionais (Visão Geral)';
      case 'statusCards': return 'Resumo de Status dos Contratos';
      case 'memberSummaryCards': return 'Resumo de Planos de Alunos';
      case 'memberRevenueSummary': return 'Faturamento Total (Contratos Adimplentes)';
      case 'delinquentRevenueSummary': return 'Faturamento Inadimplente';
      case 'receivablesDashboard': return 'Dashboard de Recebíveis';
      case 'annualDashboard': return 'Dashboard de Planos Anuais';
      case 'personalDashboard': return 'Dashboard de Planos Personal';
      case 'onlineSalesDashboard': return 'Dashboard de Vendas Online';
      case 'revenuePerContractChart': return 'Faturamento por Tipo de Contrato (Top 10)';
      case 'membersPerContractChart': return 'Alunos por Tipo de Contrato (Top 10)';
      case 'planTypeChart': return 'Distribuição de Alunos por Tipo de Plano';
      case 'memberRevenueByCategory': return 'Faturamento por Categoria de Contrato (Ativos)';
      case 'contractStatusChart': return 'Distribuição por Status dos Contratos';
      case 'onlineSalesChart': return 'Gráfico de Vendas Online'; // Placeholder, if needed
      default: return id.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    }
  };

  // --- Main Report Title ---
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor);
  doc.text("Relatório de Análise DarkS Gym", pageWidth / 2, y + 10, { align: 'center' });
  y += 25;

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor);
  doc.text("Visão Geral de Performance e Gestão de Alunos", pageWidth / 2, y, { align: 'center' });
  y += 20; // More space after main title

  // --- Section: Gráficos e Cards ---
  if (chartImages.length > 0) {
    for (const chart of chartImages) {
      if (!chart.dataUrl) continue; // Skip if dataUrl is empty

      const loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => {
          console.error(`Failed to load image for chart ${chart.id}:`, e);
          reject(new Error(`Failed to load image for chart ${chart.id}`));
        };
        img.src = chart.dataUrl;
      });

      const imgWidth = contentWidth;
      const imgHeight = (loadedImage.height * imgWidth) / loadedImage.width;

      // Check if new page is needed for the section title + image + spacing
      checkNewPage(lineHeight * 2 + imgHeight + sectionSpacing);

      // Section Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor); // Usar primaryColor para títulos de seção
      doc.text(getFriendlyTitle(chart.id), margin, y);
      y += lineHeight + 3; // Space after section title

      // Add a subtle background/border for the image
      const imagePadding = 3;
      doc.setFillColor(30, 30, 30); // Card Background
      doc.rect(margin - imagePadding, y - imagePadding, imgWidth + 2 * imagePadding, imgHeight + 2 * imagePadding, 'F');
      doc.setDrawColor(51, 51, 51); // Border Color
      doc.setLineWidth(0.2);
      doc.rect(margin - imagePadding, y - imagePadding, imgWidth + 2 * imagePadding, imgHeight + 2 * imagePadding, 'S');

      doc.addImage(loadedImage, 'PNG', margin, y, imgWidth, imgHeight);
      y += imgHeight + sectionSpacing; // Space after image
    }
  }

  // Add headers and footers to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeaderAndFooter(i, totalPages);
  }

  return doc;
};