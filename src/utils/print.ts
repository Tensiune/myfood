import React from 'react';
import ReactDOMServer from 'react-dom/server';
import OrderReceipt from "@/components/merchant/OrderReceipt";

interface PrintSettings {
  paperWidth: "80mm" | "58mm";
  fontSize: "small" | "medium" | "large";
  includeLogo: boolean;
  margin: number; // em mm
}

/**
 * Gera o HTML completo do recibo com CSS de impressão embutido.
 */
const generateReceiptHtml = (order: any, merchantName: string, customerName: string, printSettings: PrintSettings) => {
    // 1. Renderiza o componente
    const receiptHtml = ReactDOMServer.renderToString(
      <OrderReceipt 
        order={order} 
        merchantName={merchantName} 
        customerName={customerName} 
        printSettings={printSettings}
      />
    );

    // 2. Gera o CSS de impressão dinâmico
    const printCss = `
      @media print {
        @page { 
          size: ${printSettings.paperWidth} auto; 
          margin: 0; 
        }
        body { 
          margin: 0; 
          padding: 0; 
          width: ${printSettings.paperWidth};
          color: #000 !important;
          background: #fff !important;
        }
        .print-container { 
          width: ${printSettings.paperWidth}; 
          padding: ${printSettings.margin}mm; 
        }
        /* Força fontes simples e monocromáticas */
        * {
          font-family: monospace !important;
          color: #000 !important;
          box-shadow: none !important;
          text-shadow: none !important;
          background: #fff !important;
        }
        /* Remove elementos de tela */
        .no-print { display: none; }
        /* Garante que bordas tracejadas sejam visíveis */
        .border-dashed { border-style: dashed !important; }
        .border-dotted { border-style: dotted !important; }
      }
    `;

    return `
        <html>
          <head>
            <title>Comanda #${order.id.slice(0, 6)}</title>
            <style>${printCss}</style>
          </head>
          <body>
            <div class="print-container">
              ${receiptHtml}
            </div>
          </body>
        </html>
    `;
};

/**
 * Dispara a impressão do recibo.
 * Usa window.open para garantir que o modo Kiosk ou o diálogo padrão funcione.
 */
export const printReceipt = (order: any, merchantName: string, customerName: string, printSettings: PrintSettings) => {
    const htmlContent = generateReceiptHtml(order, merchantName, customerName, printSettings);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Espera um ciclo para garantir que o DOM esteja pronto antes de imprimir
        printWindow.onload = () => {
            printWindow.print();
            // Fecha a janela após a impressão (útil para modo não-kiosk)
            printWindow.onafterprint = () => {
                printWindow.close();
            }
        };
    }
};