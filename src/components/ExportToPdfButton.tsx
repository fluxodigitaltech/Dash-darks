import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { generateDashboardPdf } from '@/utils/pdfGenerator'; // Import the new generator
import html2canvas from 'html2canvas'; // Import html2canvas

interface ChartRef {
  id: string;
  ref: React.RefObject<HTMLElement>;
}

interface ExportToPdfButtonProps {
  members: any[]; // Pass members data
  receivablesData: any[]; // Pass receivables data
  monthlyStats: any[]; // Pass monthly stats
  prospectsData: any[]; // Pass prospects data
  chartRefs: ChartRef[]; // New: Array of chart images
  fileName?: string;
  buttonText?: string;
  className?: string;
}

export const ExportToPdfButton: React.FC<ExportToPdfButtonProps> = ({
  members,
  receivablesData,
  monthlyStats,
  prospectsData,
  chartRefs, // New: Receive chart refs
  fileName = 'relatorio_darksgym_profissional.pdf',
  buttonText = 'Exportar para PDF',
  className,
}) => {
  const handleExport = async () => {
    showSuccess("Gerando PDF profissional... Isso pode levar alguns segundos.");

    try {
      const chartImages = await Promise.all(
        chartRefs.map(async (chartRef) => {
          if (chartRef.ref.current) {
            const canvas = await html2canvas(chartRef.ref.current, {
              scale: 2, // Aumenta a escala para melhor qualidade
              useCORS: true,
              logging: false,
              backgroundColor: getComputedStyle(document.body).getPropertyValue('--card') || '#1a202c', // Usar a cor do card para o fundo
            });
            return { id: chartRef.id, dataUrl: canvas.toDataURL('image/png') };
          }
          return { id: chartRef.id, dataUrl: '' }; // Fallback
        })
      );

      const doc = await generateDashboardPdf({
        members,
        receivablesData,
        monthlyStats,
        prospectsData,
        chartImages: chartImages.filter(img => img.dataUrl !== ''), // Filter out empty images
      });
      doc.save(fileName);
      showSuccess("PDF profissional gerado com sucesso!");
    } catch (error) {
      // console.error("Erro ao gerar PDF profissional:", error);
      showError("Falha ao gerar o PDF profissional. Verifique o console para detalhes.");
    }
  };

  return (
    <Button onClick={handleExport} className={className}>
      <FileText className="mr-2 h-4 w-4" />
      {buttonText}
    </Button>
  );
};