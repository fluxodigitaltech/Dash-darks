import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToExcel } from '@/utils/export'; // Importa o novo utilitário

interface ExportToExcelButtonProps {
  data: any[] | undefined;
  fileName: string;
  buttonText: string;
  disabled?: boolean;
  className?: string;
}

export const ExportToExcelButton: React.FC<ExportToExcelButtonProps> = ({
  data,
  fileName,
  buttonText,
  disabled = false,
  className,
}) => {
  const handleExport = () => {
    if (data) {
      exportToExcel(data, fileName);
    }
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      size="sm"
      disabled={disabled || !data || data.length === 0}
      className={className}
    >
      <Download className="mr-2 h-4 w-4" />
      {buttonText}
    </Button>
  );
};