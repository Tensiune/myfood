"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, Phone, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
}

const ChatPage = () => {
  const { id: receiverId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { startCall } = useCall();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCommunicationExpired, setIsCommunicationExpired] = useState(false);
  const [receiverInfo, setReceiverInfo] = useState<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    const initChat = async () => {
      if (!currentUser || !receiverId) return;

      try {
        const { data: profile } = await supabase.rpc('get_user_full_name', { user_id: receiverId });
        
        // Regra de 24h: se o usuário for Lojista ou Entregador, verifica a última mensagem do CLIENTE
        const userRole = currentUser.user_metadata?.role;
        if (userRole === 'MERCHANT' || userRole === 'DRIVER') {
            const { data: lastClientMsg } = await supabase
                .from('order_chats')
                .select('created_at')
                .eq('sender_id', receiverId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (lastClientMsg) {
                const lastTime = new Date(lastClientMsg.created_at).getTime();
                const diff = Date.now() - lastTime;
                if (diff > 24 * 60 * 60 * 1000) {
                    setIsCommunicationExpired(true);
                }
            }
        }

        setReceiverInfo({ name: profile || "Contato", id: receiverId });

        const { data: history, error } = await supabase
          .from('order_chats')
          .select('*')
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        const filteredHistory = (history || []).filter(m => 
            (m.sender_id === currentUser.id && m.receiver_id === receiverId) ||
            (m.sender_id === receiverId && m.receiver_id === currentUser.id)
        );

        setMessages(filteredHistory);
      } catch (err) {
        console.error("Chat init error:", err);
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }

      const channel = supabase
        .channel(`chat_${currentUser.id}_${receiverId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_chats' }, (payload: any) => {
            const msg = payload.new as Message;
            const isRelevant = 
                (msg.sender_id === currentUser.id && msg.receiver_id === receiverId) ||
                (msg.sender_id === receiverId && msg.receiver_id === currentUser.id);

            if (isRelevant) {
              setMessages(prev => [...prev, msg]);
              setTimeout(scrollToBottom, 50);
              // Se o cliente mandou mensagem nova, "reseta" o timer de 24h localmente
              if (msg.sender_id === receiverId) setIsCommunicationExpired(false);
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    initChat();
  }, [receiverId, currentUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !receiverId || isCommunicationExpired) return;

    const content = newMessage;
    setNewMessage("");

    try {
      const { error } = await supabase
        .from('order_chats')
        .insert({
          order_id: orderId || null,
          sender_id: currentUser.id,
          receiver_id: receiverId,
          message: content
        });

      if (error) throw error;
    } catch (err) {
      showError("Falha ao enviar.");
      setNewMessage(content);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-2" />
        <p className="text-gray-400 font-bold">Abrindo conversa...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col max-w-2xl mx-auto shadow-2xl">
      <header className="bg-white border-b border-gray-100 p-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-6 w-6 text-indigo-800" />
          </Button>
          <div>
            <h2 className="font-black text-gray-900 leading-tight truncate">{receiverInfo?.name}</h2>
            <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-gray-400 font-bold uppercase">Disponível</span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" size="icon" className="rounded-full text-indigo-600 bg-indigo-50"
          onClick={() => receiverId && startCall(receiverId)}
          disabled={isCommunicationExpired}
        >
            <Phone className="h-5 w-5" />
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-indigo-50/20">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex w-full flex-col animate-in fade-in slide-in-from-bottom-1", msg.sender_id === currentUser?.id ? "items-end" : "items-start")}>
            <div className={cn("max-w-[85%] px-4 py-3 rounded-2xl shadow-sm", 
              msg.sender_id === currentUser?.id ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-indigo-50")}>
              <p className="text-sm font-medium leading-relaxed">{msg.message}</p>
              <span className="text-[9px] opacity-60 block mt-1 text-right font-bold uppercase">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t border-gray-100 safe-area-bottom">
        <form onSubmit={handleSendMessage} className={cn("flex items-center gap-2", isCommunicationExpired && "opacity-50")}>
          <div className="flex-1 relative">
            <Input
              placeholder={isCommunicationExpired ? "Chat bloqueado (24h sem resposta do cliente)" : "Escreva sua mensagem..."}
              className="flex-1 rounded-2xl border-gray-100 bg-gray-50 h-12"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isCommunicationExpired}
            />
            {isCommunicationExpired && <div className="absolute inset-0 cursor-not-allowed z-10" />}
          </div>
          <Button type="submit" size="icon" className="h-12 w-12 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 shadow-lg" disabled={!newMessage.trim() || isCommunicationExpired}>
            <Send className="h-5 w-5 text-white" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;