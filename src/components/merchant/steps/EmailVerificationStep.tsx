"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/shared/OtpInput";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

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

  // Countdown timer for resend button
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!email) {
      showError("Por favor, informe seu e-mail.");
      return;
    }
    
    setLoading(true);
    try {
      // Send OTP via Supabase
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // We don't want to create a user yet
          emailRedirectTo: `${window.location.origin}/merchant-register`
        }
      });
      
      if (error) throw error;
      
      setOtpSent(true);
      setCountdown(60); // 60 second cooldown
      showSuccess("Código de verificação enviado para seu e-mail!");
    } catch (error: any) {
      showError(error.message || "Erro ao enviar código de verificação.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      showError("Por favor, informe o código de verificação completo.");
      return;
    }
    
    setLoading(true);
    try {
      // Verify OTP with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Email verified successfully
        onNext();
      } else {
        showError("Código de verificação inválido.");
      }
    } catch (error: any) {
      showError(error.message || "Erro ao verificar código.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>E-mail Profissional</Label>
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Código de Verificação</Label>
            <OtpInput 
              value={otp} 
              onChange={setOtp} 
              length={6} 
              className="justify-center"
            />
            <p className="text-sm text-gray-500">
              Enviamos um código para <span className="font-medium">{email}</span>
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl"
              onClick={() => setOtpSent(false)}
            >
              Voltar
            </Button>
            <Button 
              className="flex-1 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3"
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6 || loading}
            >
              {loading ? "Verificando..." : "Verificar"}
            </Button>
          </div>
          
          <div className="text-center">
            <Button 
              variant="link" 
              className="text-sm text-indigo-600"
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
          className="w-full rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-7 text-lg shadow-lg shadow-brand-accent/20"
          onClick={handleSendOtp}
          disabled={loading || !email}
        >
          {loading ? "Enviando..." : "Enviar Código de Verificação"}
        </Button>
      )}
    </div>
  );
};

export default EmailVerificationStep;