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
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    audioRef.current = new Audio(RINGING_SOUND);
    audioRef.current.loop = true;
  }, []);

  const cleanup = () => {
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
    setActiveCall(null);
    setIsIncoming(false);
    pendingCandidates.current = [];
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
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        cleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const processPendingCandidates = async () => {
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
  };

  // Listener de Realtime para sincronização de sinal
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`calls_v3_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, async (payload) => {
        const call = payload.new as any;
        
        // Recebendo chamada
        if (payload.eventType === 'INSERT' && call.receiver_id === user.id) {
          const { data: name } = await supabase.rpc('get_user_full_name', { user_id: call.caller_id });
          setActiveCall({ ...call, caller_name: name });
          setIsIncoming(true);
          audioRef.current?.play().catch(() => {});
        }

        // Atualizações de sinal (Oferta/Resposta/Status)
        if (payload.eventType === 'UPDATE' && (call.caller_id === user.id || call.receiver_id === user.id)) {
          
          if (['rejected', 'ended'].includes(call.status)) {
            cleanup();
            return;
          }

          setActiveCall(prev => ({ ...prev, ...call }));

          // 1. CALLER detecta que o RECEIVER aceitou
          if (call.status === 'accepted' && call.caller_id === user.id && !pcRef.current) {
            await handleCallerHandshake(call);
          }

          // 2. RECEIVER detecta sinal vindo do CALLER
          if (call.caller_signal && call.receiver_id === user.id && pcRef.current) {
            if (pcRef.current.signalingState === 'stable') return;
            
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(call.caller_signal));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            
            await supabase.from('calls').update({ receiver_signal: answer }).eq('id', call.id);
            await processPendingCandidates();
          }

          // 3. CALLER detecta sinal vindo do RECEIVER (finaliza Handshake)
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
        if (ice.sender_id !== user.id) {
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
  }, [user]);

  const handleCallerHandshake = async (call: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      const pc = createPeerConnection(call.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await supabase.from('calls').update({ caller_signal: offer }).eq('id', call.id);
    } catch (e) {
      console.error("Caller handshake error", e);
      cleanup();
    }
  };

  const startCall = async (receiverId: string) => {
    if (!user) return;
    cleanup(); // Limpa chamadas anteriores
    
    const { data, error } = await supabase.from('calls').insert({ 
      caller_id: user.id, 
      receiver_id: receiverId, 
      status: 'calling' 
    }).select().single();
    
    if (data) {
      const { data: name } = await supabase.rpc('get_user_full_name', { user_id: receiverId });
      setActiveCall({ ...data, receiver_name: name });
    }
  };

  const acceptCall = async () => {
    if (!activeCall) return;
    audioRef.current?.pause();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const pc = createPeerConnection(activeCall.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await supabase.from('calls').update({ status: 'accepted' }).eq('id', activeCall.id);
      setActiveCall(prev => ({ ...prev, status: 'accepted' }));
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