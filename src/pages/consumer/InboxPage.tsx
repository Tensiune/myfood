"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageSquare, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

const InboxPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const chats = [
    {
      id: "1",
      name: "Restaurante Sabor",
      avatar: "https://placehold.co/100x100/FF6347/FFFFFF?text=S",
      lastMessage: "Seu pedido #1234 já saiu para entrega!",
      time: "10:30",
      unread: 1,
      type: "establishment"
    },
    {
      id: "2",
      name: "João (Entregador)",
      avatar: "https://placehold.co/100x100/4682B4/FFFFFF?text=J",
      lastMessage: "Estou chegando no seu endereço, pode descer?",
      time: "Ontem",
      unread: 0,
      type: "delivery"
    },
    {
      id: "3",
      name: "Pizzaria Delícia",
      avatar: "https://placehold.co/100x100/FFA500/FFFFFF?text=P",
      lastMessage: "Obrigado pela preferência! Esperamos que goste.",
      time: "2 dias",
      unread: 0,
      type: "establishment"
    }
  ];

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-indigo-800">Mensagens</h1>
        <p className="text-gray-600">Fale com os estabelecimentos e entregadores</p>
      </div>

      <div className="relative">
        <Input
          placeholder="Buscar conversas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-full border-2 border-indigo-100 pl-10 py-6 focus:border-brand-accent focus:ring-brand-accent transition-all"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      <div className="space-y-3">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <Card 
              key={chat.id} 
              className="rounded-2xl border-gray-100 hover:border-brand-accent/50 transition-all cursor-pointer overflow-hidden shadow-sm"
              onClick={() => navigate(`/chat/${chat.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-14 w-14 border-2 border-indigo-50">
                    <AvatarImage src={chat.avatar} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                      {chat.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {chat.unread > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-brand-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {chat.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-800 truncate">{chat.name}</h3>
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                      {chat.time}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${chat.unread > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                    {chat.lastMessage}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                      chat.type === 'establishment' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {chat.type === 'establishment' ? 'Loja' : 'Entregador'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 space-y-4">
            <div className="bg-indigo-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="h-10 w-10 text-indigo-300" />
            </div>
            <p className="text-gray-500">Nenhuma conversa encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;