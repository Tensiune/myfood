"use client";

import React, { useEffect, useRef } from "react";
import { useCall } from "@/context/CallContext";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, User, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

const CallOverlay = () => {
  const { activeCall, isIncoming, acceptCall, rejectCall, endCall, remoteStream, localStream } = useCall();
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Vincular o áudio remoto ao elemento de áudio quando disponível
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!activeCall) return null;

  const name = isIncoming ? activeCall.caller_name : activeCall.receiver_name;
  const isAccepted = activeCall.status === 'accepted';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-indigo-900/95 backdrop-blur-md animate-in fade-in duration-300">
      {/* Elemento de áudio para ouvir o outro lado */}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="w-full max-w-sm text-center space-y-8">
        <div className="relative mx-auto w-32 h-32">
          <div className={cn(
            "absolute inset-0 rounded-full bg-white/10 animate-ping",
            isAccepted ? "animate-none" : ""
          )} />
          <div className="relative bg-white/20 rounded-full w-full h-full flex items-center justify-center border-4 border-white/30">
            <User className="w-16 h-16 text-white" />
          </div>
          {isAccepted && !localStream && (
             <div className="absolute -bottom-2 -right-2 bg-red-500 p-2 rounded-full border-2 border-white">
                <MicOff className="h-4 w-4 text-white" />
             </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white">{name || "Contato"}</h2>
          <p className="text-indigo-200 font-bold uppercase tracking-widest">
            {isAccepted ? (remoteStream ? "Em ligação..." : "Conectando áudio...") : isIncoming ? "Chamada de Voz Recebida" : "Chamando..."}
          </p>
        </div>

        <div className="flex justify-center items-center gap-8">
          {isIncoming && !isAccepted ? (
            <>
              <Button 
                variant="destructive" 
                size="icon" 
                className="w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-transform"
                onClick={rejectCall}
              >
                <PhoneOff className="w-8 h-8" />
              </Button>
              <Button 
                className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl hover:scale-110 transition-transform"
                onClick={acceptCall}
              >
                <Phone className="w-10 h-10 text-white" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-6">
              {isAccepted && (
                 <div className="flex items-center gap-3">
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 animate-pulse">
                        <Mic className="h-8 w-8 text-indigo-300" />
                    </div>
                 </div>
              )}
              <Button 
                variant="destructive" 
                className="w-20 h-20 rounded-full shadow-2xl hover:scale-110 transition-transform"
                onClick={endCall}
              >
                <PhoneOff className="w-10 h-10" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;