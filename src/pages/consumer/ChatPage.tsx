"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, Phone, Loader2, MessageSquare, AlertCircle } from "lucide-react";
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
        setReceiverInfo({ name: profile || "Contato", id: receiverId });

        // LÓGICA DE EXPIRAÇÃO CORRIGIDA
        const userRole = currentUser.user_metadata?.role;
        if (userRole === 'MERCHANT' || userRole === 'DRIVER') {
            // Se houver um orderId, verifica se o pedido ainda está ativo
            if (orderId) {
                const { data: order } = await supabase.from('orders').select('status').eq('id', orderId).single();
                
                // Se o pedido está finalizado (DELIVERED ou CANCELLED), aplica regra de 24h
                if (order && ['DELIVERED', 'CANCELLED'].includes(order.status)) {
                    const { data: lastClientMsg } = await supabase
                        .from('order_chats')
                        .select('created_at')
                        .eq('sender_id', receiverId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                    
                    if (lastClientMsg) {
                        const lastTime = new Date(lastClientMsg.created_at).getTime();
                        if (Date.now() - lastTime > 24 * 60 * 60 * 1000) {
                            setIsCommunicationExpired(true);
                        }
                    } else {
                        // Se nunca houve mensagem e o pedido foi entregue há mais de 24h, bloqueia
                        // (Simplificado: bloqueia apenas se houve conversa prévia ou se for muito antigo)
                    }
                }
            }
        }

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
        console.error("Chat error:", err);
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }

      const channel = supabase
        .channel(`chat_realtime_${receiverId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_chats' }, (payload: any) => {
            const msg = payload.new as Message;
            if ((msg.sender_id === currentUser.id && msg.receiver_id === receiverId) ||
                (msg.sender_id === receiverId && msg.receiver_id === currentUser.id)) {
              setMessages(prev => [...prev, msg]);
              setTimeout(scrollToBottom, 50);
              if (msg.sender_id === receiverId) setIsCommunicationExpired(false);
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    initChat();
  }, [receiverId, currentUser, orderId]);

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
      showError("Erro ao enviar.");
      setNewMessage(content);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-2" />
        <p className="text-gray-400 font-bold">Carregando mensagens...</p>
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
                <span className="text-[10px] text-gray-400 font-bold uppercase">Online</span>
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
        {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30">
                <MessageSquare className="h-16 w-16 mb-4" />
                <p className="font-bold">Inicie a conversa agora mesmo.</p>
            </div>
        ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn("flex w-full flex-col animate-in fade-in slide-in-from-bottom-1", msg.sender_id === currentUser?.id ? "items-end" : "items-start")}>
                <div className={cn("max-w-[85%] px-4 py-3 rounded-2xl shadow-sm", 
                  msg.sender_id === currentUser?.id ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-indigo-50")}>
                  <p className="text-sm font-medium">{msg.message}</p>
                  <span className="text-[9px] opacity-60 block mt-1 text-right font-bold">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100 safe-area-bottom">
        {isCommunicationExpired && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-xs font-bold animate-in zoom-in-95">
                <AlertCircle className="h-4 w-4" />
                Comunicação bloqueada (24h sem resposta do cliente após o pedido).
            </div>
        )}
        <form onSubmit={handleSendMessage} className={cn("flex items-center gap-2", isCommunicationExpired && "opacity-50")}>
          <Input
            placeholder={isCommunicationExpired ? "Chat bloqueado" : "Escreva sua mensagem..."}
            className="flex-1 rounded-2xl border-gray-100 bg-gray-50 h-12"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isCommunicationExpired}
          />
          <Button type="submit" size="icon" className="h-12 w-12 rounded-2xl bg-brand-accent hover:bg-brand-accent/90" disabled={!newMessage.trim() || isCommunicationExpired}>
            <Send className="h-5 w-5 text-white" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;