"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";

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

const iceServers = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };
const RINGING_SOUND = "https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3";

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isIncoming, setIsIncoming] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(RINGING_SOUND);
    audioRef.current.loop = true;
  }, []);

  const cleanup = useCallback(async (callStatus: 'ended' | 'rejected' | 'missed' = 'ended') => {
    if (callTimerRef.current) {
        clearTimeout(callTimerRef.current);
        callTimerRef.current = null;
    }
    
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    
    if (activeCall) {
        const contactName = isIncoming ? activeCall.caller_name : activeCall.receiver_name;
        
        if (callStatus === 'missed') {
            addNotification({
                title: "Chamada Perdida",
                message: `Você perdeu uma chamada de ${contactName}.`,
                type: "info",
                link: `/chat/${isIncoming ? activeCall.caller_id : activeCall.receiver_id}`
            });
        } else if (callStatus === 'rejected' && !isIncoming) {
             addNotification({
                title: "Chamada Rejeitada",
                message: `${contactName} rejeitou sua chamada.`,
                type: "info",
            });
        } else if (callStatus === 'ended') {
             // Notifica apenas se a chamada foi estabelecida
             if (activeCall.status === 'accepted') {
                 addNotification({
                    title: "Chamada Encerrada",
                    message: `A ligação com ${contactName} foi encerrada.`,
                    type: "info",
                });
             }
        }
    }

    setActiveCall(null);
    setIsIncoming(false);
    pendingCandidates.current = [];
  }, [activeCall, isIncoming, localStream, addNotification]);

  const processPendingCandidates = useCallback(async () => {
    if (!pcRef.current || !pcRef.current.remoteDescription) return;
    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      if (candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding queued candidate", e);
        }
      }
    }
  }, []);

  const createPeerConnection = useCallback((callId: string, stream: MediaStream) => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(iceServers);
    
    stream.getTracks().forEach(track => pc.addTrack(track, stream)); // Adiciona stream local

    pc.onicecandidate = (event) => {
      if (event.candidate && user) {
        supabase.from('call_ice_candidates').insert({
          call_id: callId,
          sender_id: user.id,
          candidate: event.candidate.toJSON()
        }).then();
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        audioRef.current?.pause(); // Parar toque ao receber mídia
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection State: ${pc.connectionState}`);
      if (['failed', 'disconnected'].includes(pc.connectionState)) {
        // Se falhar, encerra a chamada no DB para notificar a outra ponta
        if (activeCall?.id) {
            supabase.from('calls').update({ status: 'ended' }).eq('id', activeCall.id).then();
        }
        cleanup();
      }
    };
    
    pc.onsignalingstatechange = () => {
        console.log(`[WebRTC] Signaling State: ${pc.signalingState}`);
    };

    pcRef.current = pc;
    return pc;
  }, [user, activeCall, cleanup]);

  const handleCallerHandshake = useCallback(async (call: any, stream: MediaStream) => {
    try {
      const pc = createPeerConnection(call.id, stream);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await supabase.from('calls').update({ caller_signal: offer }).eq('id', call.id);
      console.log("[WebRTC] Caller sent Offer.");
    } catch (e) {
      console.error("Caller handshake error", e);
      cleanup();
    }
  }, [createPeerConnection, cleanup]);

  const startCall = async (receiverId: string) => {
    if (!user) return;
    cleanup(); 
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        
        const { data, error } = await supabase.from('calls').insert({ 
          caller_id: user.id, 
          receiver_id: receiverId, 
          status: 'calling' 
        }).select().single();
        
        if (error) throw error;
        
        const { data: name } = await supabase.rpc('get_user_full_name', { user_id: receiverId });
        const newCall = { ...data, receiver_name: name };
        setActiveCall(newCall);
        
        // Inicia o Peer Connection e envia a Offer imediatamente
        await handleCallerHandshake(newCall, stream);
        
        // Inicia o toque e o timer de 60s para rejeição automática
        audioRef.current?.play().catch(() => {});
        callTimerRef.current = setTimeout(async () => {
            await supabase.from('calls').update({ status: 'rejected' }).eq('id', newCall.id);
        }, 60000); 

    } catch (e) {
        console.error("Start call error:", e);
        cleanup();
    }
  };

  const acceptCall = async () => {
    if (!activeCall || !user || isIncoming === false) return;
    audioRef.current?.pause();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const pc = createPeerConnection(activeCall.id, stream);
      
      // 1. Atualiza status para aceito (notifica o caller)
      await supabase.from('calls').update({ status: 'accepted' }).eq('id', activeCall.id);
      setActiveCall(prev => ({ ...prev, status: 'accepted' }));
      
      // 2. Processa a Offer do Caller (que já deve estar no DB)
      if (activeCall.caller_signal) {
          await pc.setRemoteDescription(new RTCSessionDescription(activeCall.caller_signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          // 3. Envia a Answer de volta
          await supabase.from('calls').update({ receiver_signal: answer }).eq('id', activeCall.id);
          console.log("[WebRTC] Receiver sent Answer.");
          await processPendingCandidates();
      } else {
          console.error("[WebRTC] Caller signal missing on accept.");
      }
    } catch (e) { 
      console.error("Accept call error:", e);
      cleanup(); 
    }
  };

  const endCall = async () => {
    if (activeCall) {
      await supabase.from('calls').update({ status: 'ended' }).eq('id', activeCall.id);
    }
    cleanup();
  };

  const rejectCall = async () => {
    if (activeCall) {
      await supabase.from('calls').update({ status: 'rejected' }).eq('id', activeCall.id);
    }
    cleanup('rejected');
  };

  // Listener de Realtime para sincronização de sinal
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`calls_v3_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, async (payload) => {
        const call = payload.new as any;
        
        // Recebendo chamada (INSERT)
        if (payload.eventType === 'INSERT' && call.receiver_id === user.id) {
          const { data: name } = await supabase.rpc('get_user_full_name', { user_id: call.caller_id });
          setActiveCall({ ...call, caller_name: name });
          setIsIncoming(true);
          audioRef.current?.play().catch(() => {});
        }

        // Atualizações de sinal (UPDATE)
        if (payload.eventType === 'UPDATE' && (call.caller_id === user.id || call.receiver_id === user.id)) {
          
          // Chamada encerrada/rejeitada
          if (['rejected', 'ended'].includes(call.status)) {
            const statusType = call.status === 'rejected' ? 'missed' : 'ended';
            cleanup(statusType);
            return;
          }

          setActiveCall(prev => ({ ...prev, ...call }));

          // 1. RECEIVER detecta sinal vindo do CALLER (após aceitar ou receber)
          if (call.caller_signal && call.receiver_id === user.id && pcRef.current) {
            if (pcRef.current.signalingState === 'stable' || pcRef.current.remoteDescription) return;
            
            // Se o status for 'calling', o receiver ainda não aceitou, mas já pode processar a offer
            if (call.status === 'calling') {
                // Apenas armazena o sinal para ser processado no 'acceptCall'
                setActiveCall(prev => ({ ...prev, caller_signal: call.caller_signal }));
                return;
            }
            
            // Se o status for 'accepted', processa a offer e envia a answer
            if (call.status === 'accepted' && !call.receiver_signal) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(call.caller_signal));
                const answer = await pcRef.current.createAnswer();
                await pcRef.current.setLocalDescription(answer);
                
                await supabase.from('calls').update({ receiver_signal: answer }).eq('id', call.id);
                await processPendingCandidates();
            }
          }

          // 2. CALLER detecta sinal vindo do RECEIVER (finaliza Handshake)
          if (call.receiver_signal && call.caller_id === user.id && pcRef.current) {
            if (pcRef.current.signalingState === 'have-local-offer') {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(call.receiver_signal));
              await processPendingCandidates();
            }
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_ice_candidates' }, async (payload) => {
        const ice = payload.new as any;
        if (ice.sender_id !== user.id && ice.call_id === activeCall?.id) {
          if (pcRef.current && pcRef.current.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(ice.candidate));
            } catch (e) {
              console.error("Error adding candidate", e);
            }
          } else {
            pendingCandidates.current.push(ice.candidate);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeCall, cleanup, createPeerConnection, processPendingCandidates]);

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