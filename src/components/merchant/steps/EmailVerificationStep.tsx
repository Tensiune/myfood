"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/shared/OtpInput";
import { showError, showSuccess } from "@/utils/toast";

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

  const handleSendOtp = async () => {
    if (!email) {
      showError("Por favor, informe seu e-mail.");
      return;
    }
    
    setLoading(true);
    try {
      // In a real app, you would send OTP via email/SMS
      // For demo purposes, we'll just simulate it
      setOtpSent(true);
      showSuccess("Código de verificação enviado para seu e-mail!");
    } catch (error: any) {
      showError(error.message || "Erro ao enviar código de verificação.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    // In a real app, you would verify the OTP with backend
    // For demo, we'll just proceed to next step
    if (otp.length === 6) {
      onNext();
    } else {
      showError("Por favor, informe o código de verificação completo.");
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