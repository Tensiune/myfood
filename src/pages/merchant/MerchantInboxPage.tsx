"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, MessageSquare, Clock, Store, User, Bike, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatSummary {
  contactId: string;
  contactName: string;
  contactRole: 'CUSTOMER' | 'DRIVER';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  orderId: string;
}

const MerchantInboxPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: rawMessages, error } = await supabase
        .from('order_chats')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const messages = rawMessages || [];
      const chatMap = new Map<string, ChatSummary>();
      const contactIds = new Set<string>();

      messages.forEach(msg => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const chatId = otherId;
        contactIds.add(otherId);

        if (!chatMap.has(chatId)) {
          chatMap.set(chatId, {
            contactId: otherId,
            contactName: "Carregando...",
            contactRole: 'CUSTOMER',
            lastMessage: msg.message,
            lastMessageTime: msg.created_at,
            unreadCount: 0,
            orderId: msg.order_id,
          });
        }
      });

      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', Array.from(contactIds));
      const { data: drivers } = await supabase.from('driver_applications').select('id, full_name').in('id', Array.from(contactIds));
      
      const finalChats: ChatSummary[] = Array.from(chatMap.values()).map(chat => {
        const profile = profiles?.find(p => p.id === chat.contactId);
        const driver = drivers?.find(d => d.id === chat.contactId);
        
        let name = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Contato Desconhecido';
        let role: 'CUSTOMER' | 'DRIVER' = 'CUSTOMER';

        if (driver) {
            name = driver.full_name || `Entregador #${chat.contactId.slice(0, 4)}`;
            role = 'DRIVER';
        }

        return {
          ...chat,
          contactName: name,
          contactRole: role,
          lastMessageTime: formatDistanceToNow(parseISO(chat.lastMessageTime), { addSuffix: true, locale: ptBR }),
        };
      });

      setChats(finalChats.sort((a, b) => parseISO(b.lastMessageTime).getTime() - parseISO(a.lastMessageTime).getTime()));

    } catch (err) {
      console.error("Erro ao buscar chats:", err);
      showError("Erro ao carregar caixa de entrada.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 15000);
    return () => clearInterval(interval);
  }, [fetchChats]);

  const filteredChats = chats.filter(chat => 
    chat.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-indigo-900">Caixa de Mensagens</h1>
        <p className="text-gray-500">Comunique-se com clientes e entregadores.</p>
      </div>

      <div className="relative">
        <Input
          placeholder="Buscar conversas por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-2xl border-2 border-gray-100 pl-10 py-6 focus:border-brand-accent focus:ring-brand-accent transition-all shadow-sm"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-2" />
          <p className="text-gray-500 font-medium">Carregando conversas...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <Card 
                key={chat.contactId} 
                className="rounded-2xl border-gray-100 hover:border-brand-accent/50 transition-all cursor-pointer overflow-hidden shadow-sm"
                onClick={() => navigate(`/chat/${chat.contactId}${chat.orderId ? `?orderId=${chat.orderId}` : ''}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-14 w-14 border-2 border-indigo-50">
                      <AvatarFallback className={cn("font-bold", chat.contactRole === 'DRIVER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
                        {chat.contactName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-800 truncate">{chat.contactName}</h3>
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                        {chat.lastMessageTime}
                      </span>
                    </div>
                    <p className={`text-sm truncate text-gray-500`}>
                      {chat.lastMessage}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                        chat.contactRole === 'DRIVER' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                      }`}>
                        {chat.contactRole === 'DRIVER' ? 'Entregador' : 'Cliente'}
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
      )}
    </div>
  );
};

export default MerchantInboxPage;