"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Phone, Info, MoreVertical, CheckCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  sender: "me" | "them";
  time: string;
  status: "sent" | "delivered" | "read";
}

const ChatPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mock de dados do chat baseado no ID
  const chatInfo = {
    name: id === "1" ? "Restaurante Sabor" : id === "2" ? "João (Entregador)" : "Pizzaria Delícia",
    avatar: id === "1" ? "https://via.placeholder.com/100/FF6347/FFFFFF?text=S" : "https://via.placeholder.com/100/4682B4/FFFFFF?text=J",
    status: "Online",
    type: id === "2" ? "delivery" : "establishment"
  };

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: "Olá! Gostaria de saber sobre o meu pedido.", sender: "me", time: "10:15", status: "read" },
    { id: "2", text: "Olá! Seu pedido já está sendo preparado com muito carinho.", sender: "them", time: "10:17", status: "read" },
    { id: "3", text: "Qual o tempo estimado para entrega?", sender: "me", time: "10:18", status: "read" },
    { id: "4", text: "Em cerca de 15 minutos o entregador sairá daqui.", sender: "them", time: "10:20", status: "read" },
    { id: "5", text: "Seu pedido #1234 já saiu para entrega!", sender: "them", time: "10:30", status: "read" },
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "me",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sent"
    };

    setMessages([...messages, msg]);
    setNewMessage("");

    // Resposta automática mockada
    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        text: "Entendido! Mais alguma coisa em que possamos ajudar?",
        sender: "them",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "read"
      };
      setMessages(prev => [...prev, reply]);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-2xl mx-auto shadow-2xl">
      {/* Header do Chat */}
      <header className="bg-white border-b border-gray-100 p-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-indigo-50">
            <ArrowLeft className="h-6 w-6 text-indigo-800" />
          </Button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {}}>
            <Avatar className="h-10 w-10 border-2 border-indigo-50">
              <AvatarImage src={chatInfo.avatar} />
              <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                {chatInfo.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-800 leading-tight truncate">{chatInfo.name}</h2>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{chatInfo.status}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-indigo-600 hover:bg-indigo-50">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-gray-400 hover:bg-indigo-50">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Área de Mensagens */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-indigo-50/30"
      >
        <div className="text-center">
          <span className="text-[10px] bg-white px-3 py-1 rounded-full text-gray-400 font-bold uppercase tracking-widest shadow-sm">
            Hoje
          </span>
        </div>

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex w-full flex-col",
              msg.sender === "me" ? "items-end" : "items-start"
            )}
          >
            <div 
              className={cn(
                "max-w-[85%] px-4 py-3 rounded-2xl shadow-sm relative",
                msg.sender === "me" 
                  ? "bg-brand-accent text-white rounded-tr-none" 
                  : "bg-white text-gray-800 rounded-tl-none border border-indigo-100"
              )}
            >
              <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
              <div className={cn(
                "flex items-center gap-1 mt-1 justify-end",
                msg.sender === "me" ? "text-white/70" : "text-gray-400"
              )}>
                <span className="text-[9px] font-bold">{msg.time}</span>
                {msg.sender === "me" && (
                  <CheckCheck className={cn("h-3 w-3", msg.status === "read" ? "text-blue-200" : "text-white/50")} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input de Mensagem */}
      <div className="p-4 bg-white border-t border-gray-100 safe-area-bottom">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            placeholder="Digite uma mensagem..."
            className="flex-1 rounded-full border-2 border-indigo-50 bg-gray-50 focus:bg-white focus:border-brand-accent py-6 text-sm transition-all"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-12 w-12 rounded-full bg-brand-accent hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/20 shrink-0"
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5 text-white" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;