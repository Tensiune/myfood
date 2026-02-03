"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, Phone, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import CallOverlay from "@/components/shared/CallOverlay";

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

      const { data: profile } = await supabase.rpc('get_user_full_name', { user_id: receiverId });
      setReceiverInfo({ name: profile || "Contato", id: receiverId });

      const { data: history, error } = await supabase
        .from('order_chats')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        showError("Erro ao carregar mensagens.");
      } else {
        setMessages(history || []);
      }
      
      setLoading(false);
      setTimeout(scrollToBottom, 100);

      const channel = supabase
        .channel(`active_chat_${currentUser.id}_${receiverId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_chats' }, (payload) => {
            const msg = payload.new as Message;
            const isFromCurrentConversation = 
                (msg.sender_id === currentUser.id && msg.receiver_id === receiverId) ||
                (msg.sender_id === receiverId && msg.receiver_id === currentUser.id);

            if (isFromCurrentConversation) {
              setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
              setTimeout(scrollToBottom, 50);
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
    if (!newMessage.trim() || !currentUser || !receiverId) return;

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

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-indigo-600 h-10 w-10" /></div>;

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col max-w-2xl mx-auto shadow-2xl">
      <CallOverlay />
      <header className="bg-white border-b border-gray-100 p-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-6 w-6 text-indigo-800" />
          </Button>
          <div>
            <h2 className="font-black text-gray-900 leading-tight truncate">{receiverInfo?.name}</h2>
            <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-gray-400 font-bold uppercase">Online agora</span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" size="icon" className="rounded-full text-indigo-600 bg-indigo-50"
          onClick={() => receiverId && startCall(receiverId)}
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
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-10">
                <MessageSquare className="h-12 w-12 mb-2" />
                <p className="font-bold">Diga "Olá" para iniciar a conversa!</p>
            </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100 safe-area-bottom">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            placeholder="Escreva sua mensagem..."
            className="flex-1 rounded-2xl border-gray-100 bg-gray-50 h-12 focus:bg-white"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button type="submit" size="icon" className="h-12 w-12 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 shadow-lg" disabled={!newMessage.trim()}>
            <Send className="h-5 w-5 text-white" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;