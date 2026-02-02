"use client";

import React from "react";
import { MapPin, Clock, Package, Store, User, Phone } from "lucide-react";

interface OrderReceiptProps {
  order: any;
  merchantName: string;
  customerName: string; // Novo prop para o nome do cliente
}

const OrderReceipt: React.FC<OrderReceiptProps> = ({ order, merchantName, customerName }) => {
  const deliveryAddress = order.delivery_address;
  const orderTime = new Date(order.created_at).toLocaleString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="p-4 max-w-xs mx-auto bg-white text-black border border-black" style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.4' }}>
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <h1 className="text-lg font-bold uppercase">{merchantName}</h1>
        <p className="text-xs">Comanda de Pedido #{order.id.slice(0, 6)}</p>
      </div>

      <div className="border-b border-dashed border-black py-2 mb-2 space-y-1">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span className="font-bold">Cliente:</span> {customerName}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span className="font-bold">Hora do Pedido:</span> {orderTime}
        </div>
        <div className="flex items-start gap-1">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Entrega:</span> {deliveryAddress.street}, {deliveryAddress.number}
            {deliveryAddress.complement && ` (${deliveryAddress.complement})`}
            <br />
            {deliveryAddress.neighborhood} - {deliveryAddress.city}/{deliveryAddress.state}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3" />
          <span className="font-bold">Pagamento:</span> {order.payment_method}
        </div>
      </div>

      <div className="border-b border-dashed border-black py-2 mb-2">
        <h2 className="font-bold text-sm mb-1 uppercase">Itens do Pedido</h2>
        {order.items.map((item: any, index: number) => (
          <div key={index} className="mb-2 border-b border-dotted border-gray-400 pb-1 last:border-b-0">
            <p className="font-extrabold text-base">
              {item.quantity}x {item.name}
            </p>
            
            {/* Exibir acompanhamentos/extras se existirem (mockado, pois o schema não tem) */}
            {item.options && item.options.length > 0 && (
              <ul className="ml-2 text-xs italic">
                {item.options.map((opt: any, i: number) => (
                  <li key={i}>+ {opt.name} (R$ {opt.price.toFixed(2)})</li>
                ))}
              </ul>
            )}

            {item.notes && (
              <p className="text-xs mt-1 bg-yellow-100 p-1 rounded">
                OBS: {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2">
        <p className="flex justify-between font-bold text-sm">
          <span>TOTAL:</span>
          <span>R$ {order.total.toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
};

export default OrderReceipt;