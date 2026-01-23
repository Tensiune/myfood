"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowRight } from "lucide-react";
import { showError } from "@/utils/toast";

interface PasswordStepProps {
  password: string;
  setPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (confirmPassword: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const PasswordStep: React.FC<PasswordStepProps> = ({ 
  password, 
  setPassword, 
  confirmPassword, 
  setConfirmPassword, 
  onNext, 
  onBack 
}) => {
  const handleNextStep = () => {
    if (password.length < 6) {
      showError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      showError("As senhas não coincidem.");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Lock className="h-16 w-16 text-brand-accent mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">Defina sua Senha</h3>
        <p className="text-gray-600">
          Esta será sua senha de acesso para todos os perfis.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Senha</Label>
          <Input 
            type="password" 
            placeholder="Mínimo 6 caracteres" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border-gray-200 h-12"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label>Confirmar Senha</Label>
          <Input 
            type="password" 
            placeholder="Repita a senha" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-xl border-gray-200 h-12"
            required
          />
        </div>
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button 
          variant="outline" 
          className="flex-1 rounded-xl"
          onClick={onBack}
        >
          Voltar
        </Button>
        <Button 
          className="flex-1 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black py-7 text-lg shadow-xl shadow-brand-accent/20"
          onClick={handleNextStep}
          disabled={!password || !confirmPassword}
        >
          Continuar
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default PasswordStep;