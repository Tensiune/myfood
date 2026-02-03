"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { showSuccess, showError } from "@/utils/toast";

interface CallContextType {
  activeCall: any | null;
  isIncoming: boolean;
  startCall: (receiverId: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
}

const RINGING_SOUND = "https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3"; // Som de telefone
const CALL_TIMEOUT = 15000; // 15 segundos

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isIncoming, setIsIncoming] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(RINGING_SOUND);
    audioRef.current.loop = true;
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global_calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, async (payload) => {
        const call = payload.new as any;

        // SE EU SOU O DESTINATÁRIO E ALGUÉM ESTÁ CHAMANDO
        if (payload.eventType === 'INSERT' && call.receiver_id === user.id) {
          const { data: callerName } = await supabase.rpc('get_user_full_name', { user_id: call.caller_id });
          setActiveCall({ ...call, caller_name: callerName });
          setIsIncoming(true);
          audioRef.current?.play().catch(() => {});
          
          // Timeout de 15 segundos para chamadas não atendidas
          timeoutRef.current = setTimeout(() => {
            handleCallTimeout(call.id);
          }, CALL_TIMEOUT);
        }

        // SE O STATUS DA CHAMADA MUDOU
        if (payload.eventType === 'UPDATE' && (call.caller_id === user.id || call.receiver_id === user.id)) {
          if (call.status === 'rejected' || call.status === 'ended' || call.status === 'missed') {
            stopCallUI();
          } else if (call.status === 'accepted') {
            audioRef.current?.pause();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            showSuccess("Chamada em andamento...");
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleCallTimeout = async (callId: string) => {
    await supabase.from('calls').update({ status: 'missed' }).eq('id', callId).eq('status', 'calling');
  };

  const stopCallUI = () => {
    setActiveCall(null);
    setIsIncoming(false);
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const startCall = async (receiverId: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('calls')
      .insert({ caller_id: user.id, receiver_id: receiverId, status: 'calling' })
      .select()
      .single();

    if (error) {
      showError("Não foi possível iniciar a chamada.");
      return;
    }

    const { data: recName } = await supabase.rpc('get_user_full_name', { user_id: receiverId });
    setActiveCall({ ...data, receiver_name: recName });
    setIsIncoming(false);
    audioRef.current?.play().catch(() => {});

    // Timeout para o originador também
    timeoutRef.current = setTimeout(() => {
      handleCallTimeout(data.id);
    }, CALL_TIMEOUT);
  };

  const acceptCall = async () => {
    if (!activeCall) return;
    await supabase.from('calls').update({ status: 'accepted' }).eq('id', activeCall.id);
  };

  const rejectCall = async () => {
    if (!activeCall) return;
    await supabase.from('calls').update({ status: 'rejected' }).eq('id', activeCall.id);
  };

  const endCall = async () => {
    if (!activeCall) return;
    await supabase.from('calls').update({ status: 'ended' }).eq('id', activeCall.id);
  };

  return (
    <CallContext.Provider value={{ activeCall, isIncoming, startCall, acceptCall, rejectCall, endCall }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall deve ser usado dentro de um CallProvider");
  return context;
};