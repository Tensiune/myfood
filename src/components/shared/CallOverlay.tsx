"use client";

import React, { useEffect, useRef } from "react";
import { useCall } from "@/context/CallContext";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, User, Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CallOverlay = () => {
  const { activeCall, isIncoming, acceptCall, rejectCall, endCall, remoteStream, localStream } = useCall();
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(console.error);
    }
  }, [remoteStream]);

  if (!activeCall) return null;

  const isAccepted = activeCall.status === 'accepted';
  const name = isIncoming ? activeCall.caller_name : activeCall.receiver_name;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-indigo-950/98 backdrop-blur-xl animate-in fade-in duration-300">
      <audio ref={remoteAudioRef} autoPlay />

      <div className="w-full max-w-sm text-center space-y-12">
        <div className="relative mx-auto w-40 h-40">
          <div className={cn(
            "absolute inset-0 rounded-full bg-indigo-500/20 animate-ping",
            isAccepted ? "animate-none scale-110 bg-green-500/10" : ""
          )} />
          <div className={cn(
            "relative rounded-full w-full h-full flex items-center justify-center border-4 transition-colors duration-500",
            isAccepted ? "bg-green-500/20 border-green-500/50" : "bg-white/10 border-white/20"
          )}>
            <User className="w-20 h-20 text-white" />
          </div>
          {isAccepted && !remoteStream && (
             <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-3 rounded-full border-2 border-white animate-spin">
                <Loader2 className="h-5 w-5 text-white" />
             </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-black text-white">{name || "Contato"}</h2>
          <p className="text-indigo-300 font-bold uppercase tracking-widest text-xs">
            {isAccepted 
                ? (remoteStream ? "Em ligação" : "Conectando...") 
                : isIncoming ? "Chamada de Voz" : "Chamando..."}
          </p>
        </div>

        <div className="flex justify-center items-center gap-10">
          {isIncoming && !isAccepted ? (
            <>
              <Button 
                variant="destructive" 
                size="icon" 
                className="w-16 h-16 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all"
                onClick={rejectCall}
              >
                <PhoneOff className="w-8 h-8" />
              </Button>
              <Button 
                className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl hover:scale-110 active:scale-95 transition-all"
                onClick={acceptCall}
              >
                <Phone className="w-10 h-10 text-white" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-8">
              {isAccepted && (
                 <div className="p-4 bg-white/5 rounded-3xl border border-white/10 animate-pulse">
                    <Mic className="h-8 w-8 text-green-400" />
                 </div>
              )}
              <Button 
                variant="destructive" 
                className="w-20 h-20 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"
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