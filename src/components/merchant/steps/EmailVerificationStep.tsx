"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError } from "@/utils/toast";
import { ArrowRight } from "lucide-react";

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
  const [loading, setLoading] = useState(false);

  const handleNextStep = () => {
    if (!email || !email.includes("@") || !email.includes(".")) {
      showError("Por favor, informe um e-mail válido.");
      return;
    }
    // In a real application, you might check if the email is already registered here.
    // For now, we proceed to collect business info before final signup.
    onNext();
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
        />
      </div>
      
      <div className="flex flex-col gap-3">
        <Button 
          className="w-full rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black py-7 text-lg shadow-xl shadow-brand-accent/20"
          onClick={handleNextStep}
          disabled={loading || !email}
        >
          {loading ? "Verificando..." : "Começar Cadastro"}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default EmailVerificationStep;