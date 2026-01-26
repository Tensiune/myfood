"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Store, 
  Map, 
  MapPin,
  Clock, 
  CreditCard, 
  Save, 
  Loader2,
  ImagePlus,
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import BusinessHoursManager, { DayHours } from "@/components/merchant/BusinessHoursManager";
import MerchantAddressForm from "@/components/merchant/MerchantAddressForm";
import DeliveryAreaManager from "@/components/merchant/DeliveryAreaManager";
import { uploadImage } from "@/lib/storage";

const BRAZILIAN_BANKS = [
  { code: "001", name: "001 - Banco do Brasil" },
  { code: "033", name: "033 - Santander" },
  { code: "104", name: "104 - Caixa Econômica Federal" },
  { code: "237", name: "237 - Bradesco" },
  { code: "341", name: "341 - Itaú Unibanco" },
  { code: "260", name: "260 - Nu Pagamentos (Nubank)" },
  { code: "077", name: "077 - Banco Inter" },
].sort((a, b) => a.name.localeCompare(b.name));

const MerchantSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // States
  const [storeInfo, setStoreInfo] = useState({
    name: "",
    description: "",
    phone: "",
    imageUrl: "",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      lat: -23.5505,
      lng: -46.6333
    }
  });

  const [hours, setHours] = useState<Record<string, DayHours>>({
    monday: { closed: false, windows: [] },
    tuesday: { closed: false, windows: [] },
    wednesday: { closed: false, windows: [] },
    thursday: { closed: false, windows: [] },
    friday: { closed: false, windows: [] },
    saturday: { closed: false, windows: [] },
    sunday: { closed: true, windows: [] }
  });

  const [deliveryArea, setDeliveryArea] = useState({
    radius: 5,
    exclusionZones: [] as [number, number][][]
  });

  const [bankInfo, setBankInfo] = useState({
    bank: "",
    accountType: "checking",
    agency: "",
    agencyDigit: "",
    account: "",
    accountDigit: ""
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata) {
          const meta = user.user_metadata;
          if (meta.store_details) setStoreInfo(meta.store_details);
          if (meta.business_hours) setHours(meta.business_hours);
          if (meta.delivery_area) setDeliveryArea(meta.delivery_area);
          if (meta.bank_info) setBankInfo(meta.bank_info);
        }
      } catch (err) {
        showError("Erro ao carregar configurações.");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const imageUrl = await uploadImage(file, `merchants/${user.id}/profile`);
      if (imageUrl) {
        setStoreInfo(prev => ({ ...prev, imageUrl }));
        showSuccess("Foto da loja atualizada!");
      }
    } catch (err: any) {
      showError("Erro ao enviar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.auth.updateUser({
        data: {
          store_details: storeInfo,
          business_hours: hours,
          delivery_area: deliveryArea,
          bank_info: bankInfo,
          store_name: storeInfo.name // Atualiza o nome amigável para o sistema
        }
      });

      if (error) throw error;

      // Também sincronizamos com a tabela pública de aplicações se necessário
      await supabase
        .from('merchant_applications')
        .update({ 
          store_name: storeInfo.name,
          metadata: {
            ...user.user_metadata,
            store_details: storeInfo,
            business_hours: hours,
            delivery_area: deliveryArea,
            bank_info: bankInfo
          }
        })
        .eq('id', user.id);

      showSuccess("Configurações salvas com sucesso!");
    } catch (err: any) {
      showError("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Carregando painel de controle...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Configurações da Loja</h1>
          <p className="text-gray-500">Gerencie todos os aspectos operacionais do seu estabelecimento.</p>
        </div>
        <Button 
          className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black h-14 px-8 shadow-xl shadow-indigo-100 gap-2"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 h-auto flex-wrap mb-8">
          <TabsTrigger value="general" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Store className="h-4 w-4 mr-2" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="logistics" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Map className="h-4 w-4 mr-2" /> Logística
          </TabsTrigger>
          <TabsTrigger value="hours" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Clock className="h-4 w-4 mr-2" /> Horários
          </TabsTrigger>
          <TabsTrigger value="financial" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <CreditCard className="h-4 w-4 mr-2" /> Financeiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-4">
                <Label className="text-sm font-black text-gray-400 uppercase tracking-widest">Foto de Capa</Label>
                <div className="relative group aspect-video rounded-3xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center">
                  {isUploading ? (
                    <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                  ) : storeInfo.imageUrl ? (
                    <img src={storeInfo.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <ImagePlus className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <span className="text-[10px] font-bold text-gray-400">UPLOAD FOTO</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleImageUpload} 
                    accept="image/*"
                  />
                  {storeInfo.imageUrl && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="text-white text-xs font-bold bg-indigo-600 px-4 py-2 rounded-full">Trocar Imagem</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 font-medium italic text-center">Recomendado: 800x400px (JPG/PNG)</p>
              </div>

              <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-indigo-900">Nome da Loja</Label>
                    <Input 
                      value={storeInfo.name} 
                      onChange={(e) => setStoreInfo({...storeInfo, name: e.target.value})}
                      className="rounded-xl h-12 border-gray-100" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-indigo-900">Telefone Público</Label>
                    <Input 
                      value={storeInfo.phone} 
                      onChange={(e) => setStoreInfo({...storeInfo, phone: e.target.value})}
                      className="rounded-xl h-12 border-gray-100" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-indigo-900">Descrição/Bio</Label>
                  <Textarea 
                    value={storeInfo.description} 
                    onChange={(e) => setStoreInfo({...storeInfo, description: e.target.value})}
                    placeholder="Conte um pouco sobre sua loja para seus clientes..."
                    className="rounded-xl resize-none h-32 border-gray-100" 
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 pt-10 border-t border-gray-50">
              <h3 className="text-lg font-black text-indigo-900 mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-600" /> Endereço do Estabelecimento
              </h3>
              <MerchantAddressForm 
                address={storeInfo.address} 
                onChange={(address) => setStoreInfo({ ...storeInfo, address })} 
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="logistics" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
            <div className="mb-6">
              <h3 className="text-xl font-black text-indigo-900">Área de Atendimento</h3>
              <p className="text-gray-500 text-sm">Defina até onde seus entregadores podem ir e marque áreas bloqueadas.</p>
            </div>
            <DeliveryAreaManager 
              center={[storeInfo.address.lat || -23.5505, storeInfo.address.lng || -46.6333]}
              radius={deliveryArea.radius}
              exclusionZones={deliveryArea.exclusionZones}
              onChange={(radius, zones) => setDeliveryArea({ radius, exclusionZones: zones })}
            />
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
            <div className="mb-8">
              <h3 className="text-xl font-black text-indigo-900">Horários de Funcionamento</h3>
              <p className="text-gray-500 text-sm">Sua loja ficará aberta automaticamente nos intervalos definidos abaixo.</p>
            </div>
            <BusinessHoursManager hours={hours} onChange={setHours} />
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8 max-w-2xl">
            <div className="mb-8 flex items-center gap-4 bg-indigo-50 p-6 rounded-3xl">
              <div className="p-3 bg-white rounded-2xl shadow-sm"><ShieldCheck className="h-8 w-8 text-indigo-600" /></div>
              <div>
                <h3 className="text-xl font-black text-indigo-900">Dados de Recebimento</h3>
                <p className="text-indigo-700/70 text-sm">Estas informações são usadas para transferir seus ganhos semanais.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-indigo-900">Banco</Label>
                <Select value={bankInfo.bank} onValueChange={(v) => setBankInfo({ ...bankInfo, bank: v })}>
                  <SelectTrigger className="rounded-xl h-12 border-gray-100">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {BRAZILIAN_BANKS.map((b) => (
                      <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-indigo-900">Tipo de Conta</Label>
                  <Select value={bankInfo.accountType} onValueChange={(v) => setBankInfo({ ...bankInfo, accountType: v })}>
                    <SelectTrigger className="rounded-xl h-12 border-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="checking">Conta Corrente</SelectItem>
                      <SelectItem value="savings">Conta Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-2">
                    <Label className="font-bold text-indigo-900">Agência</Label>
                    <Input value={bankInfo.agency} onChange={(e) => setBankInfo({...bankInfo, agency: e.target.value})} className="rounded-xl h-12" placeholder="0001" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-indigo-900">Dígito</Label>
                    <Input value={bankInfo.agencyDigit} onChange={(e) => setBankInfo({...bankInfo, agencyDigit: e.target.value})} className="rounded-xl h-12 text-center" maxLength={1} placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label className="font-bold text-indigo-900">Número da Conta</Label>
                  <Input value={bankInfo.account} onChange={(e) => setBankInfo({...bankInfo, account: e.target.value})} className="rounded-xl h-12" placeholder="12345678" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-indigo-900">Dígito</Label>
                  <Input value={bankInfo.accountDigit} onChange={(e) => setBankInfo({...bankInfo, accountDigit: e.target.value})} className="rounded-xl h-12 text-center" maxLength={1} placeholder="X" />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MerchantSettingsPage;