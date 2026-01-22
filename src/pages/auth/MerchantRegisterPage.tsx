"use client";

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { Store, Building2, User, Mail, Lock, MapPin, Phone, FileText } from "lucide-react";
import { OtpInput } from "@/components/shared/OtpInput";

const MerchantRegisterPage = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: Business Info, 3: Address Map, 4: Category, 5: Legal Representative
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Step 1: Email verification
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
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
  
  // Step 3: Map validation (mock)
  const [mapValidated, setMapValidated] = useState(false);
  
  // Step 4: Category selection
  const [category, setCategory] = useState("");
  
  // Step 5: Legal representative
  const [legalRep, setLegalRep] = useState({
    cpf: "",
    fullName: ""
  });
  
  const categories = [
    "mercado", "açai", "africana", "alemã", "árabe", "argentina", "brasileira", 
    "cafeteria", "carnes", "casa de sucos", "chinesa", "colombiana", "congelados", 
    "coreana", "doces e bolos", "espanhola", "francesa", "frutos do mar", "indiana", 
    "italiana", "japonesa", "lanches", "marmita", "mediterrânea", "mexicana", 
    "padaria", "pastel", "peixes", "peruana", "pizza", "portuguesa", "salgados", 
    "saudável", "sorvetes", "tailandesa", "vegetariana"
  ];

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
      setStep(2);
    } else {
      showError("Por favor, informe o código de verificação completo.");
    }
  };

  const handleBusinessInfoSubmit = () => {
    if (!businessInfo.cnpj || !businessInfo.phone || !businessInfo.street || 
        !businessInfo.number || !businessInfo.neighborhood || !businessInfo.city || 
        !businessInfo.state || !businessInfo.zipCode) {
      showError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setStep(3);
  };

  const handleAddressValidation = () => {
    // In a real app, you would validate address with map API
    setMapValidated(true);
    setStep(4);
  };

  const handleCategorySelect = () => {
    if (!category) {
      showError("Por favor, selecione uma categoria.");
      return;
    }
    setStep(5);
  };

  const handleFinalSubmit = async () => {
    if (!legalRep.cpf || !legalRep.fullName) {
      showError("Por favor, preencha todos os dados do representante legal.");
      return;
    }
    
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 py-12">
      <div className="flex items-center gap-2 mb-8 text-indigo-900">
        <Store className="h-10 w-10 text-brand-accent" />
        <h1 className="text-3xl font-black tracking-tight">Seja um Parceiro</h1>
      </div>
      
      <Card className="w-full max-w-2xl rounded-3xl shadow-xl border-none overflow-hidden">
        <div className="bg-indigo-900 p-8 text-white text-center">
          <CardTitle className="text-2xl font-bold">
            {step === 1 && "Verificação de E-mail"}
            {step === 2 && "Informações da Empresa"}
            {step === 3 && "Validação de Endereço"}
            {step === 4 && "Categoria do Estabelecimento"}
            {step === 5 && "Representante Legal"}
          </CardTitle>
          <p className="text-indigo-200 mt-2">
            Passo {step} de 5
          </p>
        </div>
        
        <CardContent className="p-8">
          {/* Step 1: Email Verification */}
          {step === 1 && (
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
          )}
          
          {/* Step 2: Business Info */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-accent" /> Dados da Empresa
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input 
                    placeholder="00.000.000/0000-00" 
                    value={businessInfo.cnpj}
                    onChange={(e) => setBusinessInfo({...businessInfo, cnpj: e.target.value})}
                    className="rounded-xl border-gray-200 h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Telefone Comercial</Label>
                  <Input 
                    placeholder="(00) 00000-0000" 
                    value={businessInfo.phone}
                    onChange={(e) => setBusinessInfo({...businessInfo, phone: e.target.value})}
                    className="rounded-xl border-gray-200 h-12"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input 
                  placeholder="00000-000" 
                  value={businessInfo.zipCode}
                  onChange={(e) => setBusinessInfo({...businessInfo, zipCode: e.target.value})}
                  className="rounded-xl border-gray-200 h-12"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input 
                    placeholder="UF" 
                    value={businessInfo.state}
                    onChange={(e) => setBusinessInfo({...businessInfo, state: e.target.value})}
                    className="rounded-xl border-gray-200 h-12"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Cidade</Label>
                  <Input 
                    placeholder="Nome da cidade" 
                    value={businessInfo.city}
                    onChange={(e) => setBusinessInfo({...businessInfo, city: e.target.value})}
                    className="rounded-xl border-gray-200 h-12"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input 
                  placeholder="Nome da rua/avenida" 
                  value={businessInfo.street}
                  onChange={(e) => setBusinessInfo({...businessInfo, street: e.target.value})}
                  className="rounded-xl border-gray-200 h-12"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input 
                    placeholder="000" 
                    value={businessInfo.number}
                    onChange={(e) => setBusinessInfo({...businessInfo, number: e.target.value})}
                    className="rounded-xl border-gray-200 h-12"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Complemento</Label>
                  <Input 
                    placeholder="Apartamento, sala, etc." 
                    value={businessInfo.complement}
                    onChange={(e) => setBusinessInfo({...businessInfo, complement: e.target.value})}
                    className="rounded-xl border-gray-200 h-12"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input 
                  placeholder="Nome do bairro" 
                  value={businessInfo.neighborhood}
                  onChange={(e) => setBusinessInfo({...businessInfo, neighborhood: e.target.value})}
                  className="rounded-xl border-gray-200 h-12"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl"
                  onClick={() => setStep(1)}
                >
                  Voltar
                </Button>
                <Button 
                  className="flex-1 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3"
                  onClick={handleBusinessInfoSubmit}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 3: Address Validation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <MapPin className="h-16 w-16 text-brand-accent mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Validar Endereço</h3>
                <p className="text-gray-600">
                  Confirme se o marcador está na localização correta do seu estabelecimento
                </p>
              </div>
              
              <div className="bg-gray-100 rounded-2xl h-64 flex items-center justify-center relative overflow-hidden">
                {/* Mock map visualization */}
                <div className="absolute inset-0 bg-blue-50">
                  <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute top-1/3 left-1/2 w-24 h-24 bg-green-200 rounded-lg"></div>
                  <div className="absolute top-2/3 left-1/3 w-32 h-16 bg-yellow-200 rounded-lg"></div>
                </div>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-2xl">
                <p className="font-medium text-indigo-900">
                  {businessInfo.street}, {businessInfo.number}
                  {businessInfo.complement && `, ${businessInfo.complement}`}
                </p>
                <p className="text-indigo-700">
                  {businessInfo.neighborhood} - {businessInfo.city}/{businessInfo.state}
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl"
                  onClick={() => setStep(2)}
                >
                  Voltar
                </Button>
                <Button 
                  className="flex-1 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3"
                  onClick={handleAddressValidation}
                >
                  Confirmar Localização
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 4: Category Selection */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <Store className="h-16 w-16 text-brand-accent mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Categoria do Estabelecimento</h3>
                <p className="text-gray-600">
                  Selecione a categoria que melhor representa o seu negócio
                </p>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {categories.map((cat) => (
                  <div 
                    key={cat}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      category === cat 
                        ? "border-brand-accent bg-brand-accent/10" 
                        : "border-gray-200 hover:border-brand-accent"
                    }`}
                    onClick={() => setCategory(cat)}
                  >
                    <p className="font-medium text-gray-800 capitalize">{cat}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl"
                  onClick={() => setStep(3)}
                >
                  Voltar
                </Button>
                <Button 
                  className="flex-1 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3"
                  onClick={handleCategorySelect}
                  disabled={!category}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 5: Legal Representative */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <User className="h-16 w-16 text-brand-accent mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Representante Legal</h3>
                <p className="text-gray-600">
                  Informe os dados do responsável legal pela empresa
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input 
                    placeholder="000.000.000-00" 
                    value={legalRep.cpf}
                    onChange={(e) => setLegalRep({...legalRep, cpf: e.target.value})}
                    className="rounded-xl border-gray-200 h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input 
                    placeholder="Nome conforme documento" 
                    value={legalRep.fullName}
                    onChange={(e) => setLegalRep({...legalRep, fullName: e.target.value})}
                    className="rounded-xl border-gray-200 h-12"
                  />
                </div>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-2xl">
                <h4 className="font-bold text-indigo-900 mb-2">Resumo do Cadastro</h4>
                <div className="space-y-1 text-sm">
                  <p className="flex justify-between">
                    <span className="text-gray-600">E-mail:</span>
                    <span className="font-medium">{email}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">CNPJ:</span>
                    <span className="font-medium">{businessInfo.cnpj}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Categoria:</span>
                    <span className="font-medium capitalize">{category}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl"
                  onClick={() => setStep(4)}
                >
                  Voltar
                </Button>
                <Button 
                  className="flex-1 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3"
                  onClick={handleFinalSubmit}
                  disabled={loading}
                >
                  {loading ? "Processando..." : "Finalizar Cadastro"}
                </Button>
              </div>
            </div>
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