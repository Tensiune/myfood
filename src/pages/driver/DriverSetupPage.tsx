"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bike, 
  MapPin, 
  Car, 
  CreditCard, 
  CheckCircle2, 
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/storage";

const VEHICLE_TYPES = [
  { id: "bike", label: "Bicicleta", icon: Bike },
  { id: "moto", label: "Moto", icon: Bike },
  { id: "car", label: "Carro", icon: Car },
  { id: "utility", label: "Utilitário", icon: Car },
  { id: "minivan", label: "Minivan", icon: Car },
];

const BRAZILIAN_BANKS = [
  { code: "001", name: "Banco do Brasil" },
  { code: "033", name: "Santander" },
  { code: "104", name: "Caixa Econômica Federal" },
  { code: "237", name: "Bradesco" },
  { code: "341", name: "Itaú Unibanco" },
  { code: "260", name: "Nubank" },
  { code: "077", name: "Banco Inter" },
];

const DriverSetupPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loadingCep, setLoadingCep] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const cnhInputRef = useRef<HTMLInputElement>(null);
  const vehicleInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [address, setAddress] = useState({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: ""
  });

  const [vehicle, setVehicle] = useState({
    type: "",
    plate: "",
    renavam: "",
    brand: "",
    model: "",
    color: ""
  });

  const [documents, setDocuments] = useState({
    cnhUrl: "",
    vehicleDocUrl: ""
  });

  const [bank, setBank] = useState({
    bank: "",
    agency: "",
    account: "",
    pix: ""
  });

  // Carregar dados existentes ao montar o componente
  useEffect(() => {
    const fetchCurrentData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata) {
          const meta = user.user_metadata;
          if (meta.address) setAddress(meta.address);
          if (meta.vehicle) setVehicle(meta.vehicle);
          if (meta.documents) setDocuments(meta.documents);
          if (meta.bank_info) setBank(meta.bank_info);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do entregador:", err);
      } finally {
        setInitializing(false);
      }
    };
    fetchCurrentData();
  }, []);

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (data.erro) {
          showError("CEP não encontrado.");
        } else {
          setAddress({
            ...address,
            street: data.logradouro || address.street,
            neighborhood: data.bairro || address.neighborhood,
            city: data.localidade || address.city,
            state: data.uf || address.state,
            zipCode: cep,
          });
        }
      } catch (error) {
        showError("Erro ao buscar CEP.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cnh' | 'vehicle') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(type);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const url = await uploadFile(file, `${user.id}`, "driver-documents");
      
      if (url) {
        setDocuments(prev => ({
          ...prev,
          [type === 'cnh' ? 'cnhUrl' : 'vehicleDocUrl']: url
        }));
        showSuccess(`${type === 'cnh' ? 'CNH' : 'CRLV'} enviado com sucesso!`);
      }
    } catch (err: any) {
      showError("Falha no envio. Verifique se o arquivo é válido.");
    } finally {
      setUploadingDoc(null);
      if (e.target) e.target.value = "";
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!address.street || !address.number || !address.city) {
        showError("Preencha os dados do seu endereço.");
        return;
      }
    } else if (step === 2) {
      if (!vehicle.type) {
        showError("Selecione o tipo de veículo.");
        return;
      }
      if (vehicle.type !== 'bike' && (!vehicle.plate || !vehicle.brand || !vehicle.model)) {
        showError("Preencha os dados do veículo.");
        return;
      }
    } else if (step === 3) {
      if (!documents.cnhUrl) {
        showError("O envio da CNH é obrigatório.");
        return;
      }
      if (vehicle.type !== 'bike' && !documents.vehicleDocUrl) {
        showError("O envio do documento do veículo é obrigatório.");
        return;
      }
    } else if (step === 4) {
      if (!bank.bank || !bank.account) {
        showError("Preencha os dados bancários.");
        return;
      }
    }
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setStep(step - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          status: 'PENDING',
          address,
          vehicle,
          documents,
          bank_info: bank,
          setup_completed_at: new Date().toISOString()
        }
      });

      if (error) throw error;
      showSuccess("Dados enviados para aprovação!");
      navigate("/driver/orders");
    } catch (error: any) {
      showError(error.message || "Erro ao salvar dados.");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Recuperando seus dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-4 py-12">
      <div className="max-w-2xl w-full mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <Bike className="text-white h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black text-indigo-900">Configuração do Entregador</h1>
          <p className="text-gray-500">Passo {step} de 5</p>
        </div>

        <Card className="rounded-3xl border-none shadow-xl overflow-hidden bg-white">
          <div className="h-2 bg-gray-100">
            <div 
              className="h-full bg-brand-accent transition-all duration-500" 
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>

          <CardContent className="p-8">
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-800">Endereço Residencial</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <div className="relative">
                      <Input 
                        placeholder="00000-000" 
                        value={address.zipCode}
                        onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                        onBlur={handleCepBlur}
                        className="rounded-xl h-12"
                      />
                      {loadingCep && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-indigo-600" />}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Rua</Label>
                    <Input 
                      placeholder="Nome da rua" 
                      value={address.street}
                      onChange={(e) => setAddress({...address, street: e.target.value})}
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input 
                      placeholder="123" 
                      value={address.number}
                      onChange={(e) => setAddress({...address, number: e.target.value})}
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input 
                      placeholder="Bairro" 
                      value={address.neighborhood}
                      onChange={(e) => setAddress({...address, neighborhood: e.target.value})}
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input 
                      placeholder="Cidade" 
                      value={address.city}
                      onChange={(e) => setAddress({...address, city: e.target.value})}
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input 
                      placeholder="UF" 
                      value={address.state}
                      onChange={(e) => setAddress({...address, state: e.target.value})}
                      className="rounded-xl h-12"
                    />
                  </div>
                </div>
                <Button className="w-full rounded-2xl bg-indigo-600 h-14 font-bold" onClick={handleNext}>
                  Próximo <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <Car className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-800">Dados do Veículo</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {VEHICLE_TYPES.map((v) => {
                    const Icon = v.icon;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVehicle({...vehicle, type: v.id})}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                          vehicle.type === v.id ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-gray-100 text-gray-400"
                        )}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-[10px] font-bold uppercase">{v.label}</span>
                      </button>
                    );
                  })}
                </div>

                {vehicle.type && vehicle.type !== 'bike' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2"><Label>Placa</Label><Input placeholder="ABC-1234" value={vehicle.plate} onChange={(e) => setVehicle({...vehicle, plate: e.target.value})} className="rounded-xl h-12" /></div>
                    <div className="space-y-2"><Label>Renavam</Label><Input placeholder="00000000000" value={vehicle.renavam} onChange={(e) => setVehicle({...vehicle, renavam: e.target.value})} className="rounded-xl h-12" /></div>
                    <div className="space-y-2"><Label>Marca</Label><Input placeholder="Ex: Honda" value={vehicle.brand} onChange={(e) => setVehicle({...vehicle, brand: e.target.value})} className="rounded-xl h-12" /></div>
                    <div className="space-y-2"><Label>Modelo</Label><Input placeholder="Ex: CG 160" value={vehicle.model} onChange={(e) => setVehicle({...vehicle, model: e.target.value})} className="rounded-xl h-12" /></div>
                    <div className="space-y-2"><Label>Cor</Label><Input placeholder="Ex: Preta" value={vehicle.color} onChange={(e) => setVehicle({...vehicle, color: e.target.value})} className="rounded-xl h-12" /></div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1 rounded-2xl" onClick={handleBack}>Voltar</Button>
                  <Button className="flex-2 rounded-2xl bg-indigo-600 h-14 font-bold" onClick={handleNext}>
                    Próximo <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-800">Documentos</h2>
                </div>

                <div className="space-y-4">
                  <div 
                    onClick={() => cnhInputRef.current?.click()}
                    className={cn(
                      "p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer relative overflow-hidden",
                      documents.cnhUrl ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-indigo-400"
                    )}
                  >
                    <input 
                      type="file" 
                      ref={cnhInputRef} 
                      className="hidden" 
                      accept=".pdf,application/pdf,image/*"
                      onChange={(e) => handleFileUpload(e, 'cnh')}
                    />
                    
                    {uploadingDoc === 'cnh' ? (
                      <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                    ) : documents.cnhUrl ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : (
                      <Upload className="h-8 w-8 text-gray-300" />
                    )}
                    
                    <div className="text-center">
                      <p className="font-bold text-gray-700">CNH (Frente e Verso)</p>
                      <p className="text-xs text-gray-400">
                        {documents.cnhUrl ? "Documento anexado" : "PDF, JPG ou PNG até 5MB"}
                      </p>
                    </div>
                  </div>

                  {vehicle.type !== 'bike' && (
                    <div 
                      onClick={() => vehicleInputRef.current?.click()}
                      className={cn(
                        "p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer relative overflow-hidden",
                        documents.vehicleDocUrl ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-indigo-400"
                      )}
                    >
                      <input 
                        type="file" 
                        ref={vehicleInputRef} 
                        className="hidden" 
                        accept=".pdf,application/pdf,image/*"
                        onChange={(e) => handleFileUpload(e, 'vehicle')}
                      />
                      
                      {uploadingDoc === 'vehicle' ? (
                        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                      ) : documents.vehicleDocUrl ? (
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      ) : (
                        <Upload className="h-8 w-8 text-gray-300" />
                      )}
                      
                      <div className="text-center">
                        <p className="font-bold text-gray-700">Documento do Veículo (CRLV)</p>
                        <p className="text-xs text-gray-400">
                          {documents.vehicleDocUrl ? "Documento anexado" : "PDF, JPG ou PNG até 5MB"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1 rounded-2xl" onClick={handleBack}>Voltar</Button>
                  <Button className="flex-2 rounded-2xl bg-indigo-600 h-14 font-bold" onClick={handleNext}>
                    Próximo <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-800">Dados Bancários</h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Select value={bank.bank} onValueChange={(v) => setBank({...bank, bank: v})}>
                      <SelectTrigger className="rounded-xl h-12">
                        <SelectValue placeholder="Selecione seu banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_BANKS.map(b => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Agência</Label><Input placeholder="0001" value={bank.agency} onChange={(e) => setBank({...bank, agency: e.target.value})} className="rounded-xl h-12" /></div>
                    <div className="space-y-2"><Label>Conta</Label><Input placeholder="000000-0" value={bank.account} onChange={(e) => setBank({...bank, account: e.target.value})} className="rounded-xl h-12" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input placeholder="E-mail, CPF ou Telefone" value={bank.pix} onChange={(e) => setBank({...bank, pix: e.target.value})} className="rounded-xl h-12" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1 rounded-2xl" onClick={handleBack}>Voltar</Button>
                  <Button className="flex-2 rounded-2xl bg-indigo-600 h-14 font-bold" onClick={handleNext}>
                    Revisar Dados <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-8">
                <div className="text-center space-y-4">
                  <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">Tudo pronto para análise!</h2>
                  <p className="text-gray-500 text-sm">Confirme as informações abaixo antes de enviar seu cadastro para nossa equipe.</p>
                </div>

                <div className="space-y-4 bg-gray-50 p-6 rounded-3xl text-sm">
                  <div className="flex justify-between border-b pb-2"><span className="text-gray-400">Veículo</span><span className="font-bold uppercase">{vehicle.type}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-gray-400">Cidade</span><span className="font-bold">{address.city}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Banco</span><span className="font-bold">{bank.bank}</span></div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1 rounded-2xl" onClick={handleBack} disabled={loading}>Voltar</Button>
                  <Button 
                    className="flex-2 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold h-16 shadow-xl shadow-brand-accent/20" 
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? "Enviando..." : "Enviar para Aprovação"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400">
          Ao enviar seu cadastro, você concorda com nossos termos de uso para entregadores parceiros.
        </p>
      </div>
    </div>
  );
};

export default DriverSetupPage;