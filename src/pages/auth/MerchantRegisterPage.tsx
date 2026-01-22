"use client";

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { Store } from "lucide-react";
import EmailVerificationStep from "@/components/merchant/steps/EmailVerificationStep";
import BusinessInfoStep from "@/components/merchant/steps/BusinessInfoStep";
import AddressValidationStep from "@/components/merchant/steps/AddressValidationStep";
import CategorySelectionStep from "@/components/merchant/steps/CategorySelectionStep";
import LegalRepresentativeStep from "@/components/merchant/steps/LegalRepresentativeStep";

const MerchantRegisterPage = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: Business Info, 3: Address Map, 4: Category, 5: Legal Representative
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Step 1: Email verification
  const [email, setEmail] = useState("");
  
  // Step 2: Business Info
  const [businessInfo, setBusinessInfo] = useState({
    cnpj: "",
    phone: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: ""
  });
  
  // Step 4: Category selection
  const [category, setCategory] = useState("");
  
  // Step 5: Legal representative
  const [legalRep, setLegalRep] = useState({
    cpf: "",
    fullName: ""
  });

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      // Create user account with all merchant data
      const { data, error } = await supabase.auth.signUp({
        email,
        password: "TempPass123!", // In a real app, this would be set by user
        options: {
          data: {
            role: 'MERCHANT',
            store_name: businessInfo.street, // Using street as store name for demo
            status: 'PENDING',
            cnpj: businessInfo.cnpj,
            phone: businessInfo.phone,
            address: businessInfo,
            category,
            legal_rep: legalRep
          }
        }
      });
      
      if (error) throw error;
      
      showSuccess("Cadastro realizado com sucesso! Aguarde a análise do administrador para ativar sua loja.");
      navigate("/login");
    } catch (error: any) {
      showError(error.message || "Erro ao cadastrar lojista.");
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch(step) {
      case 1: return "Verificação de E-mail";
      case 2: return "Informações da Empresa";
      case 3: return "Validação de Endereço";
      case 4: return "Categoria do Estabelecimento";
      case 5: return "Representante Legal";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 py-12">
      <div className="flex items-center gap-2 mb-8 text-indigo-900">
        <Store className="h-10 w-10 text-brand-accent" />
        <h1 className="text-3xl font-black tracking-tight">Seja um Parceiro</h1>
      </div>
      
      <Card className="w-full max-w-2xl rounded-3xl shadow-xl border-none overflow-hidden">
        <div className="bg-indigo-900 p-8 text-white text-center">
          <h2 className="text-2xl font-bold">
            {getStepTitle()}
          </h2>
          <p className="text-indigo-200 mt-2">
            Passo {step} de 5
          </p>
        </div>
        
        <CardContent className="p-8">
          {step === 1 && (
            <EmailVerificationStep 
              email={email}
              setEmail={setEmail}
              onNext={() => setStep(2)}
            />
          )}
          
          {step === 2 && (
            <BusinessInfoStep 
              businessInfo={businessInfo}
              setBusinessInfo={setBusinessInfo}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          
          {step === 3 && (
            <AddressValidationStep 
              businessInfo={businessInfo}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          
          {step === 4 && (
            <CategorySelectionStep 
              category={category}
              setCategory={setCategory}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}
          
          {step === 5 && (
            <LegalRepresentativeStep 
              legalRep={legalRep}
              setLegalRep={setLegalRep}
              businessInfo={businessInfo}
              email={email}
              category={category}
              onNext={handleFinalSubmit}
              onBack={() => setStep(4)}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">
          Já tem uma conta de parceiro?{" "}
          <Link to="/login" className="font-bold text-indigo-600 hover:underline">
            Entrar agora
          </Link>
        </p>
      </div>
    </div>
  );
};

export default MerchantRegisterPage;