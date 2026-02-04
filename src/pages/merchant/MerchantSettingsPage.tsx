"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  ShieldCheck,
  Printer,
  Truck,
  Plus,
  Trash2,
  Mail,
  UserCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import BusinessHoursManager, { DayHours } from "@/components/merchant/BusinessHoursManager";
import MerchantAddressForm from "@/components/merchant/MerchantAddressForm";
import DeliveryAreaManager from "@/components/merchant/DeliveryAreaManager";
import { uploadImage } from "@/lib/storage";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const BRAZILIAN_BANKS = [
  { code: "001", name: "001 - Banco do Brasil" },
  { code: "033", name: "033 - Santander" },
  { code: "104", name: "104 - Caixa Econômica Federal" },
  { code: "237", name: "237 - Bradesco" },
  { code: "341", name: "341 - Itaú Unibanco" },
  { code: "260", name: "260 - Nu Pagamentos (Nubank)" },
  { code: "077", name: "077 - Banco Inter" },
].sort((a, b) => a.name.localeCompare(b.name));

interface PrintSettings {
  paperWidth: "80mm" | "58mm";
  fontSize: "small" | "medium" | "large";
  includeLogo: boolean;
  margin: number;
}

const defaultPrintSettings: PrintSettings = {
  paperWidth: "80mm",
  fontSize: "medium",
  includeLogo: false,
  margin: 5,
};

const MerchantSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newDriverEmail, setNewDriverEmail] = useState("");

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
    exclusionZones: [] as [number, number][][],
    allows_pickup: true,
    delivery_mode: 'APP' as 'APP' | 'OWN',
    authorized_drivers: [] as string[]
  });

  const [bankInfo, setBankInfo] = useState({
    bank: "",
    accountType: "checking",
    agency: "",
    agencyDigit: "",
    account: "",
    accountDigit: ""
  });
  
  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata) {
          const meta = user.user_metadata;
          if (meta.store_details) setStoreInfo(meta.store_details);
          if (meta.business_hours) setHours(meta.business_hours);
          if (meta.delivery_area) setDeliveryArea({ 
              ...deliveryArea, 
              ...meta.delivery_area 
          });
          if (meta.bank_info) setBankInfo(meta.bank_info);
          if (meta.print_settings) setPrintSettings(meta.print_settings);
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

  const handleAddDriver = async () => {
    if (!newDriverEmail.trim() || !newDriverEmail.includes("@")) {
      showError("Insira um e-mail válido.");
      return;
    }

    if (deliveryArea.authorized_drivers?.includes(newDriverEmail.toLowerCase())) {
        showError("Este entregador já está na lista.");
        return;
    }

    const tid = showLoading("Validando entregador...");
    try {
        // Verifica se o e-mail pertence a um entregador aprovado
        const { data, error } = await supabase
            .from('driver_applications')
            .select('id, status')
            .eq('email', newDriverEmail.toLowerCase())
            .single();

        if (error || !data) {
            showError("Entregador não encontrado na nossa base.");
            return;
        }

        if (data.status !== 'APPROVED') {
            showError("Este entregador ainda não foi aprovado pela plataforma.");
            return;
        }

        setDeliveryArea(prev => ({
            ...prev,
            authorized_drivers: [...(prev.authorized_drivers || []), newDriverEmail.toLowerCase()]
        }));
        setNewDriverEmail("");
        showSuccess("Entregador adicionado!");
    } catch (e) {
        showError("Erro ao validar entregador.");
    } finally {
        dismissToast(tid);
    }
  };

  const handleRemoveDriver = (email: string) => {
    setDeliveryArea(prev => ({
      ...prev,
      authorized_drivers: prev.authorized_drivers.filter(e => e !== email)
    }));
    showSuccess("Entregador removido.");
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedMetadata = {
          store_details: storeInfo,
          business_hours: hours,
          delivery_area: deliveryArea,
          bank_info: bankInfo,
          print_settings: printSettings,
          store_name: storeInfo.name 
      };

      const { error } = await supabase.auth.updateUser({
        data: updatedMetadata
      });

      if (error) throw error;

      await supabase
        .from('merchant_applications')
        .update({ 
          store_name: storeInfo.name,
          metadata: updatedMetadata
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
            <Truck className="h-4 w-4 mr-2" /> Forma de Entrega
          </TabsTrigger>
          <TabsTrigger value="area" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Map className="h-4 w-4 mr-2" /> Área de Atuação
          </TabsTrigger>
          <TabsTrigger value="hours" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Clock className="h-4 w-4 mr-2" /> Horários
          </TabsTrigger>
          <TabsTrigger value="financial" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <CreditCard className="h-4 w-4 mr-2" /> Financeiro
          </TabsTrigger>
          <TabsTrigger value="print" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Printer className="h-4 w-4 mr-2" /> Impressão
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
                      <span className="text-[10px] font-bold text-gray-400">Adicionar Foto</span>
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
            <div className="space-y-10">
              <section>
                <div className="mb-6">
                  <h3 className="text-xl font-black text-indigo-900">Configurações de Logística</h3>
                  <p className="text-gray-500 text-sm">Escolha como seus pedidos serão entregues aos clientes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setDeliveryArea({ ...deliveryArea, delivery_mode: 'APP' })}
                    className={cn(
                      "p-6 rounded-[2rem] border-4 transition-all flex items-center gap-4 text-left",
                      deliveryArea.delivery_mode === 'APP' 
                        ? "border-indigo-600 bg-indigo-50" 
                        : "border-gray-50 bg-gray-50/50 hover:bg-gray-50"
                    )}
                  >
                    <div className={cn("p-3 rounded-2xl shadow-sm", deliveryArea.delivery_mode === 'APP' ? "bg-indigo-600 text-white" : "bg-white text-gray-400")}>
                      <Truck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-black text-indigo-900">Entregadores do App</p>
                      <p className="text-xs text-indigo-700/60 font-medium">Buscamos o melhor entregador disponível na rede para você.</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setDeliveryArea({ ...deliveryArea, delivery_mode: 'OWN' })}
                    className={cn(
                      "p-6 rounded-[2rem] border-4 transition-all flex items-center gap-4 text-left",
                      deliveryArea.delivery_mode === 'OWN' 
                        ? "border-indigo-600 bg-indigo-50" 
                        : "border-gray-50 bg-gray-50/50 hover:bg-gray-50"
                    )}
                  >
                    <div className={cn("p-3 rounded-2xl shadow-sm", deliveryArea.delivery_mode === 'OWN' ? "bg-indigo-600 text-white" : "bg-white text-gray-400")}>
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-black text-indigo-900">Frota Própria / Exclusiva</p>
                      <p className="text-xs text-indigo-700/60 font-medium">Você gerencia seus próprios entregadores através do e-mail.</p>
                    </div>
                  </button>
                </div>
              </section>

              {deliveryArea.delivery_mode === 'OWN' && (
                <section className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-indigo-600" />
                    <h4 className="font-black text-indigo-900">Gerenciar Entregadores Próprios</h4>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                      <Input 
                        placeholder="E-mail do entregador cadastrado" 
                        value={newDriverEmail}
                        onChange={(e) => setNewDriverEmail(e.target.value)}
                        className="rounded-2xl h-14 pl-12 border-gray-100 bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <Button 
                      className="rounded-2xl bg-indigo-600 h-14 px-8 font-black shadow-lg"
                      onClick={handleAddDriver}
                    >
                      Adicionar <Plus className="ml-2 h-5 w-5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {deliveryArea.authorized_drivers?.length > 0 ? (
                      deliveryArea.authorized_drivers.map((email) => (
                        <div key={email} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-indigo-50 rounded-lg shrink-0"><Mail className="h-4 w-4 text-indigo-600" /></div>
                            <span className="text-sm font-bold text-gray-700 truncate">{email}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                            onClick={() => handleRemoveDriver(email)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-10 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                        <p className="text-gray-400 font-bold text-sm">Nenhum entregador próprio cadastrado.</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              <section className="pt-6 border-t border-gray-100">
                <div className="bg-indigo-50 p-6 rounded-[2rem] flex items-center justify-between gap-6 border border-indigo-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl shadow-sm"><Store className="h-5 w-5 text-indigo-600" /></div>
                      <div>
                        <p className="font-bold text-indigo-900">Retirada no Local</p>
                        <p className="text-[10px] text-gray-500 uppercase font-black">Permitir que o cliente retire o pedido</p>
                      </div>
                    </div>
                    <Switch 
                        checked={deliveryArea.allows_pickup} 
                        onCheckedChange={(val) => setDeliveryArea({ ...deliveryArea, allows_pickup: val })} 
                    />
                </div>
              </section>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="area" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
            <div className="mb-8">
              <h3 className="text-xl font-black text-indigo-900">Área de Atendimento</h3>
              <p className="text-gray-500 text-sm">Gerencie o raio de entrega e áreas onde você não atende.</p>
            </div>
            <DeliveryAreaManager 
              center={[storeInfo.address.lat || -23.5505, storeInfo.address.lng || -46.6333]}
              radius={deliveryArea.radius}
              exclusionZones={deliveryArea.exclusionZones}
              onChange={(radius, zones) => setDeliveryArea({ ...deliveryArea, radius, exclusionZones: zones })}
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
        
        <TabsContent value="print" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8 max-w-2xl">
            <div className="mb-8 flex items-center gap-4 bg-indigo-50 p-6 rounded-3xl">
              <div className="p-3 bg-white rounded-2xl shadow-sm"><Printer className="h-8 w-8 text-indigo-600" /></div>
              <div>
                <h3 className="text-xl font-black text-indigo-900">Configurações de Impressão</h3>
                <p className="text-indigo-700/70 text-sm">Ajuste o formato da comanda para sua impressora térmica.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-indigo-900">Largura do Papel</Label>
                <Select 
                  value={printSettings.paperWidth} 
                  onValueChange={(v) => setPrintSettings({ ...printSettings, paperWidth: v as "80mm" | "58mm" })}
                >
                  <SelectTrigger className="rounded-xl h-12 border-gray-100">
                    <SelectValue placeholder="Selecione a largura" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="80mm">80 mm (Padrão)</SelectItem>
                    <SelectItem value="58mm">58 mm (Compacto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-indigo-900">Tamanho da Fonte</Label>
                  <Select 
                    value={printSettings.fontSize} 
                    onValueChange={(v) => setPrintSettings({ ...printSettings, fontSize: v as "small" | "medium" | "large" })}
                  >
                    <SelectTrigger className="rounded-xl h-12 border-gray-100">
                      <SelectValue placeholder="Selecione o tamanho" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="small">Pequena (10px)</SelectItem>
                      <SelectItem value="medium">Média (12px)</SelectItem>
                      <SelectItem value="large">Grande (14px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-indigo-900">Margem (mm)</Label>
                  <Input 
                    type="number"
                    value={printSettings.margin} 
                    onChange={(e) => setPrintSettings({...printSettings, margin: parseInt(e.target.value) || 0})}
                    className="rounded-xl h-12 border-gray-100" 
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex flex-col">
                  <Label className="text-indigo-900 font-bold cursor-pointer" htmlFor="include-logo-switch">Incluir Logo</Label>
                  <span className="text-[10px] text-gray-500 uppercase font-black">Pode ser lento em algumas impressoras</span>
                </div>
                <Switch 
                  id="include-logo-switch"
                  checked={printSettings.includeLogo} 
                  onCheckedChange={(v) => setPrintSettings({...printSettings, includeLogo: v})} 
                />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MerchantSettingsPage;