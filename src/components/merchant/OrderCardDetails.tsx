"use client";

import React from "react";
import { MapPin, User, Phone, CreditCard, DollarSign } from "lucide-react";

interface OrderCardDetailsProps {
  order: any;
}

const OrderCardDetails: React.FC<OrderCardDetailsProps> = ({ order }) => {
  const deliveryAddress = order.delivery_address;
  const customerName = order.customer_full_name || "Cliente";

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100 animate-in fade-in">
      <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
        <div className="flex items-center gap-1 text-gray-700 font-bold">
          <User className="h-3 w-3 text-indigo-500" />
          <span>{customerName}</span>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-600">
        <MapPin className="h-3 w-3 mt-0.5 text-brand-accent shrink-0" />
        <p className="flex-1 leading-tight">
          {deliveryAddress.street}, {deliveryAddress.number} <br/>
          <span className="font-bold text-gray-800">Bairro: {deliveryAddress.neighborhood}</span>
        </p>
      </div>

      <div className="space-y-1 pt-2 border-t border-gray-100">
        <p className="text-[10px] font-black text-gray-400 uppercase">Itens:</p>
        {order.items.map((item: any, i: number) => (
          <p key={i} className="text-xs text-gray-700 truncate">
            <span className="font-bold text-indigo-600">{item.quantity}x</span> {item.name}
          </p>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <CreditCard className="h-3 w-3" />
          <span className="uppercase font-bold">{order.payment_method}</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-black text-indigo-900">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span>R$ {order.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderCardDetails;