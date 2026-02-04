import * as XLSX from 'xlsx';

/**
 * Converte um array de objetos em um arquivo Excel (.xlsx) e força o download.
 * @param data Array de objetos a ser exportado.
 * @param fileName Nome do arquivo (sem extensão).
 * @param sheetName Nome da aba na planilha.
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Relatório') {
  if (!data || data.length === 0) {
    console.error("Nenhum dado para exportar.");
    return;
  }

  // 1. Cria a planilha a partir do array de objetos
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 2. Cria o livro de trabalho (workbook)
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 3. Escreve o arquivo e força o download
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}