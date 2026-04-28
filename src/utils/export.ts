import * as xlsx from 'xlsx';
import { showSuccess } from './toast';

export const exportToExcel = (data: any[], fileName: string) => {
  if (!data || data.length === 0) {
    // console.warn("Exportação cancelada: não há dados para exportar.");
    return;
  }

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Dados');

  // Adiciona um timestamp ao nome do arquivo para torná-lo único
  const date = new Date();
  const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
  const finalFileName = `${fileName}_${timestamp}.xlsx`;

  xlsx.writeFile(workbook, finalFileName);
  showSuccess(`Planilha "${finalFileName}" gerada com sucesso!`);
};