"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

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

  const createPeerConnection = (callId: string) => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(iceServers);
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
      setRemoteStream(event.streams[0]);
    };

    pcRef.current = pc;
    return pc;
  };

  // Listener principal de chamadas
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('calls_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, async (payload) => {
        const call = payload.new as any;
        
        // NOVA CHAMADA (INCOMING)
        if (payload.eventType === 'INSERT' && call.receiver_id === user.id) {
          const { data: name } = await supabase.rpc('get_user_full_name', { user_id: call.caller_id });
          setActiveCall({ ...call, caller_name: name });
          setIsIncoming(true);
          audioRef.current?.play().catch(() => {});
        }

        // ATUALIZAÇÕES (HANDSHAKE)
        if (payload.eventType === 'UPDATE' && (call.caller_id === user.id || call.receiver_id === user.id)) {
          setActiveCall(prev => ({ ...prev, ...call }));

          if (['rejected', 'ended'].includes(call.status)) {
            cleanup();
            return;
          }

          // FLUXO DO CHAMADOR (CALLER)
          if (call.status === 'accepted' && call.caller_id === user.id && !pcRef.current) {
            handleStartHandshakeAsCaller(call);
          }

          // FLUXO DO RECEBEDOR (RECEIVER) - Recebendo sinal do caller
          if (call.caller_signal && call.receiver_id === user.id && pcRef.current) {
              if (pcRef.current.signalingState === 'stable') return;
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(call.caller_signal));
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              await supabase.from('calls').update({ receiver_signal: answer }).eq('id', call.id);
          }

          // FINALIZAÇÃO DO CHAMADOR (CALLER) - Recebendo resposta do receiver
          if (call.receiver_signal && call.caller_id === user.id && pcRef.current) {
              if (pcRef.current.signalingState === 'have-local-offer') {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(call.receiver_signal));
              }
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_ice_candidates' }, (payload) => {
        const ice = payload.new as any;
        if (ice.sender_id !== user.id && pcRef.current) {
          pcRef.current.addIceCandidate(new RTCIceCandidate(ice.candidate)).catch(() => {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleStartHandshakeAsCaller = async (call: any) => {
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

  const startCall = async (receiverId: string) => {
    if (!user) return;
    const { data } = await supabase.from('calls').insert({ caller_id: user.id, receiver_id: receiverId, status: 'calling' }).select().single();
    if (data) {
      const { data: name } = await supabase.rpc('get_user_full_name', { user_id: receiverId });
      setActiveCall({ ...data, receiver_name: name });
    }
  };

  const acceptCall = async () => {
    if (!activeCall) return;
    audioRef.current?.pause();

    try {
      // 1. Pede microfone antes de tudo
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      // 2. Prepara conexão WebRTC
      const pc = createPeerConnection(activeCall.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 3. Notifica o DB do aceite - Isso dispara o 'accepted' no caller
      await supabase.from('calls').update({ status: 'accepted' }).eq('id', activeCall.id);
      
      // Atualiza estado local
      setActiveCall(prev => ({ ...prev, status: 'accepted' }));
    } catch (e) { 
      console.error("Microphone error:", e);
      cleanup(); 
    }
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