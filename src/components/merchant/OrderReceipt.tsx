"use client";

import React from "react";

interface PrintSettings {
  paperWidth: "80mm" | "58mm";
  fontSize: "small" | "medium" | "large";
  includeLogo: boolean;
  margin: number;
}

interface OrderReceiptProps {
  order: any;
  merchantName: string;
  customerName: string;
  printSettings: PrintSettings;
}

const OrderReceipt: React.FC<OrderReceiptProps> = ({ order, merchantName, customerName, printSettings }) => {
  if (!order) return <div className="p-4 text-center text-xs">Dados do pedido não encontrados.</div>;

  const deliveryAddress = order.delivery_address || {};
  const orderTime = order.created_at 
    ? new Date(order.created_at).toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : "N/A";

  const baseFontSize = printSettings.fontSize === 'small' ? '10px' : 
                       printSettings.fontSize === 'large' ? '14px' : '12px';
  
  const headerFontSize = printSettings.fontSize === 'small' ? '14px' : 
                         printSettings.fontSize === 'large' ? '18px' : '16px';

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div 
      className="p-4 max-w-xs mx-auto bg-white text-black" 
      style={{ 
        fontFamily: 'monospace', 
        fontSize: baseFontSize, 
        lineHeight: '1.4',
        width: printSettings.paperWidth,
        padding: `${printSettings.margin}mm`,
      }}
    >
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <h1 style={{ fontSize: headerFontSize, fontWeight: 'bold', textTransform: 'uppercase' }}>{merchantName}</h1>
        <p className="text-xs">Comanda de Pedido #{order.id?.slice(0, 6)}</p>
      </div>

      <div className="border-b border-dashed border-black py-2 mb-2 space-y-1">
        <div><span className="font-bold">Cliente:</span> {customerName || "Não informado"}</div>
        <div><span className="font-bold">Hora:</span> {orderTime}</div>
        <div>
          <span className="font-bold">Entrega:</span> {deliveryAddress.street || "S/R"}, {deliveryAddress.number || "S/N"}
          {deliveryAddress.neighborhood && ` - ${deliveryAddress.neighborhood}`}
        </div>
        <div><span className="font-bold">Pagamento:</span> {order.payment_method || "N/A"}</div>
      </div>

      <div className="border-b border-dashed border-black py-2 mb-2">
        <h2 className="font-bold text-sm mb-1 uppercase">Itens</h2>
        {items.length > 0 ? items.map((item: any, index: number) => (
          <div key={index} className="mb-2 border-b border-dotted border-gray-400 pb-1 last:border-b-0">
            <p className="font-extrabold text-base">
              {item.quantity}x {item.name}
            </p>
            {item.notes && <p className="text-xs mt-1 bg-gray-100 p-1">OBS: {item.notes}</p>}
          </div>
        )) : <p className="text-xs italic">Nenhum item encontrado.</p>}
      </div>

      <div className="pt-2">
        <p className="flex justify-between font-bold text-sm">
          <span>TOTAL:</span>
          <span>R$ {(order.total || 0).toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
};

export default OrderReceipt;