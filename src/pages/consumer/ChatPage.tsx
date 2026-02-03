"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Phone, MoreVertical, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
}

const ChatPage = () => {
  const { id: receiverId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [receiverInfo, setReceiverInfo] = useState<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Buscar info do recebedor
      const { data: profile } = await supabase.rpc('get_user_full_name', { user_id: receiverId });
      setReceiverInfo({ name: profile || "Contato", id: receiverId });

      // Carregar mensagens históricas
      const { data: history } = await supabase
        .from('order_chats')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (history) setMessages(history);
      setLoading(false);
      
      // Inscrever no Realtime para mensagens novas ONDE eu sou o destinatário
      const channel = supabase
        .channel(`chat_${user.id}_${receiverId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'order_chats',
          filter: `receiver_id=eq.${user.id}`
        }, (payload) => {
          const msg = payload.new as Message;
          // Só adiciona se for do remetente que estou conversando agora
          if (msg.sender_id === receiverId) {
            setMessages(prev => {
              // Evita duplicatas caso o canal receba algo já inserido localmente
              if (prev.find(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    initChat();
  }, [receiverId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId) return;

    const msgContent = newMessage;
    setNewMessage("");

    try {
      const { data, error } = await supabase
        .from('order_chats')
        .insert({
          order_id: orderId,
          sender_id: currentUserId,
          receiver_id: receiverId,
          message: msgContent
        })
        .select()
        .single();

      if (error) throw error;
      // Adiciona localmente para feedback instantâneo
      setMessages(prev => [...prev, data]);
    } catch (err) {
      showError("Erro ao enviar mensagem.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-2xl mx-auto shadow-2xl">
      <header className="bg-white border-b border-gray-100 p-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-6 w-6 text-indigo-800" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-indigo-50">
              <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                {receiverInfo?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-bold text-gray-800 leading-tight truncate">{receiverInfo?.name}</h2>
              <span className="text-[10px] text-green-500 font-bold uppercase">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-indigo-600" asChild>
            <a href={`tel:${receiverInfo?.phone || ""}`}><Phone className="h-5 w-5" /></a>
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-indigo-50/30">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex w-full flex-col", msg.sender_id === currentUserId ? "items-end" : "items-start")}>
            <div className={cn("max-w-[85%] px-4 py-3 rounded-2xl shadow-sm", 
              msg.sender_id === currentUserId ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none")}>
              <p className="text-sm font-medium">{msg.message}</p>
              <span className="text-[9px] opacity-70 block mt-1 text-right">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            className="flex-1 rounded-full border-indigo-50 bg-gray-50 focus:bg-white"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button type="submit" size="icon" className="h-12 w-12 rounded-full bg-brand-accent shadow-lg" disabled={!newMessage.trim()}>
            <Send className="h-5 w-5 text-white" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;