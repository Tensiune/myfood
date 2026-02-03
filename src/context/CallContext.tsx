"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { showError } from "@/utils/toast";

interface CallContextType {
  activeCall: any | null;
  isIncoming: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (receiverId: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
}

const RINGING_SOUND = "https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3";
const iceServers = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isIncoming, setIsIncoming] = useState(false);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(RINGING_SOUND);
    audioRef.current.loop = true;
  }, []);

  // Inicializa a conexão WebRTC
  const createPeerConnection = (callId: string) => {
    const pc = new RTCPeerConnection(iceServers);

    pc.onicecandidate = async (event) => {
      if (event.candidate && user) {
        await supabase.from('call_ice_candidates').insert({
          call_id: callId,
          sender_id: user.id,
          candidate: event.candidate.toJSON()
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("[WebRTC] Áudio remoto recebido");
      setRemoteStream(event.streams[0]);
    };

    pcRef.current = pc;
    return pc;
  };

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('calls_engine')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, async (payload) => {
        const call = payload.new as any;

        // RECEBENDO CHAMADA
        if (payload.eventType === 'INSERT' && call.receiver_id === user.id) {
          const { data: name } = await supabase.rpc('get_user_full_name', { user_id: call.caller_id });
          setActiveCall({ ...call, caller_name: name });
          setIsIncoming(true);
          audioRef.current?.play().catch(() => {});
        }

        // ATUALIZAÇÕES DE STATUS OU SINAIS
        if (payload.eventType === 'UPDATE' && (call.caller_id === user.id || call.receiver_id === user.id)) {
          if (['rejected', 'ended', 'missed'].includes(call.status)) {
            cleanup();
          } 
          
          // O destinatário aceitou, o originador começa a conexão
          if (call.status === 'accepted' && call.caller_id === user.id && !pcRef.current) {
            handleStartHandshake(call);
          }

          // Se eu sou o receiver e recebi o sinal do caller
          if (call.caller_signal && call.receiver_id === user.id && !pcRef.current && call.status === 'accepted') {
             // Handshake já iniciado via UI ou automaticamente
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_ice_candidates' }, async (payload) => {
          const ice = payload.new as any;
          if (ice.sender_id !== user.id && pcRef.current) {
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(ice.candidate));
              } catch (e) { console.error("ICE error", e); }
          }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const cleanup = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIsIncoming(false);
  };

  const startCall = async (receiverId: string) => {
    if (!user) return;
    const { data, error } = await supabase.from('calls').insert({ 
      caller_id: user.id, 
      receiver_id: receiverId, 
      status: 'calling' 
    }).select().single();
    
    if (error) return;
    const { data: name } = await supabase.rpc('get_user_full_name', { user_id: receiverId });
    setActiveCall({ ...data, receiver_name: name });
    audioRef.current?.play().catch(() => {});
  };

  const handleStartHandshake = async (call: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      
      const pc = createPeerConnection(call.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from('calls').update({ caller_signal: offer }).eq('id', call.id);
    } catch (e) { cleanup(); }
  };

  const acceptCall = async () => {
    if (!activeCall || !user) return;
    audioRef.current?.pause();

    try {
      // 1. Marcar como aceito no DB
      await supabase.from('calls').update({ status: 'accepted' }).eq('id', activeCall.id);

      // 2. Pedir microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      // 3. Criar PC
      const pc = createPeerConnection(activeCall.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 4. Esperar o sinal do Caller (Offer)
      const checkOffer = setInterval(async () => {
          const { data } = await supabase.from('calls').select('caller_signal').eq('id', activeCall.id).single();
          if (data?.caller_signal) {
              clearInterval(checkOffer);
              await pc.setRemoteDescription(new RTCSessionDescription(data.caller_signal));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await supabase.from('calls').update({ receiver_signal: answer }).eq('id', activeCall.id);
          }
      }, 1000);

      // 5. Escutar Resposta do Caller (Caso o fluxo seja invertido, mas aqui o receiver responde)
      const channel = supabase.channel(`call_signals_${activeCall.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${activeCall.id}` }, async (payload) => {
            const updatedCall = payload.new as any;
            if (updatedCall.receiver_signal && user.id === updatedCall.caller_id) {
                await pcRef.current?.setRemoteDescription(new RTCSessionDescription(updatedCall.receiver_signal));
            }
        }).subscribe();

    } catch (e) { cleanup(); }
  };

  const endCall = async () => {
    if (activeCall) await supabase.from('calls').update({ status: 'ended' }).eq('id', activeCall.id);
    cleanup();
  };

  const rejectCall = async () => {
    if (activeCall) await supabase.from('calls').update({ status: 'rejected' }).eq('id', activeCall.id);
    cleanup();
  };

  return (
    <CallContext.Provider value={{ activeCall, isIncoming, localStream, remoteStream, startCall, acceptCall, rejectCall, endCall }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall deve ser usado dentro de um CallProvider");
  return context;
};