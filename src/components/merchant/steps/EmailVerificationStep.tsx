"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/shared/OtpInput";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { Info } from "lucide-react";

interface EmailVerificationStepProps {
  email: string;
  setEmail: (email: string) => void;
  onNext: () => void;
}

const EmailVerificationStep: React.FC<EmailVerificationStepProps> = ({ 
  email, 
  setEmail, 
  onNext 
}) => {
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!email || !email.includes("@")) {
      showError("Por favor, informe um e-mail válido.");
      return;
    }
    
    setLoading(true);
    try {
      // Por padrão, o Supabase envia um Magic Link. 
      // Para enviar um CÓDIGO de 6 dígitos, você deve configurar o template 
      // de e-mail "Magic Link" no seu painel Supabase para incluir {{ .Token }}
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/merchant-register`
        }
      });
      
      if (error) throw error;
      
      setOtpSent(true);
      setCountdown(60);
      showSuccess("E-mail de verificação enviado!");
    } catch (error: any) {
      showError(error.message || "Erro ao enviar e-mail.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      showError("Informe o código de 6 dígitos recebido.");
      return;
    }
    
    setLoading(true);
    try {
      // Quando usamos signInWithOtp, o tipo de verificação é 'email' ou 'magiclink'
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email' 
      });
      
      if (error) throw error;
      
      if (data.session || data.user) {
        onNext();
      } else {
        showError("Código inválido ou expirado.");
      }
    } catch (error: any) {
      // Se der erro de tipo, tentamos como 'magiclink' (alguns projetos variam dependendo da versão/config)
      try {
        const { data: retryData, error: retryError } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'magiclink'
        });
        if (!retryError && (retryData.session || retryData.user)) {
          onNext();
          return;
        }
      } catch (e) {}
      
      showError("Código inválido. Verifique se o e-mail contém um código ou apenas um link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="font-bold text-gray-700">E-mail Profissional</Label>
        <Input 
          type="email" 
          placeholder="loja@email.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border-gray-200 h-12"
          disabled={otpSent}
        />
      </div>
      
      {otpSent ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 space-y-1">
                <p className="font-bold">Atenção:</p>
                <p>Se o seu e-mail não contém um código de 6 dígitos, apenas um link, você deve clicar no link para validar ou configurar seu template no Supabase.</p>
                <p className="mt-2">Caso esteja apenas testando a interface, você pode clicar em "Simular" abaixo.</p>
              </div>
            </div>

            <div className="space-y-2 text-center">
              <Label className="font-bold text-gray-700">Código de 6 dígitos</Label>
              <OtpInput 
                value={otp} 
                onChange={setOtp} 
                length={6} 
                className="justify-center"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              className="w-full rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black py-4 text-lg"
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6 || loading}
            >
              {loading ? "Verificando..." : "Verificar Código"}
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl h-12 font-bold text-gray-500"
                onClick={() => setOtpSent(false)}
              >
                Alterar E-mail
              </Button>
              <Button 
                variant="ghost" 
                className="flex-1 rounded-xl h-12 font-bold text-indigo-600 hover:bg-indigo-50"
                onClick={onNext}
              >
                Simular (Dev)
              </Button>
            </div>
          </div>
          
          <div className="text-center">
            <Button 
              variant="link" 
              className="text-xs text-gray-400 font-bold uppercase tracking-widest"
              onClick={handleSendOtp}
              disabled={countdown > 0 || loading}
            >
              {countdown > 0 
                ? `Reenviar código em ${countdown}s` 
                : "Não recebeu o código? Reenviar"}
            </Button>
          </div>
        </div>
      ) : (
        <Button 
          className="w-full rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black py-7 text-lg shadow-xl shadow-brand-accent/20"
          onClick={handleSendOtp}
          disabled={loading || !email}
        >
          {loading ? "Enviando..." : "Começar Cadastro"}
        </Button>
      )}
    </div>
  );
};

export default EmailVerificationStep;