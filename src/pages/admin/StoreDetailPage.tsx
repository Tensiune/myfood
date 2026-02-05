"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Store, 
  Building2, 
  MapPin, 
  Clock, 
  CreditCard, 
  User, 
  ShieldCheck,
  Phone,
  Mail,
  Loader2,
  Calendar,
  Globe
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const StoreDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any>(null);

  useEffect(() => {
    const fetchStore = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase.from('merchant_applications').select('*').eq('id', id).single();
        if (error) throw error;
        setStore(data);
      } catch (err: any) {
        showError("Loja não encontrada.");
        navigate("/admin/stores");
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [id, navigate]);

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>;
  if (!store) return null;

  const meta = store.metadata || {};
  const details = meta.store_details || {};
  const addr = details.address || meta.address || {};
  const legalRep = meta.legal_rep || {};
  const bank = meta.bank_info || {};
  const hours = meta.business_hours || {};

  const dayLabels: Record<string, string> = {
    monday: "Segunda", tuesday: "Terça", wednesday: "Quarta", thursday: "Quinta", 
    friday: "Sexta", saturday: "Sábado", sunday: "Domingo"
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-white shadow-sm"><ArrowLeft /></Button>
          <div>
            <h1 className="text-2xl font-black text-indigo-900">{store.store_name}</h1>
            <p className="text-sm text-gray-500">ID: {store.id}</p>
          </div>
        </div>
        <Badge className={cn(
            "rounded-full px-4 py-1.5 text-xs font-bold",
            store.status === 'APPROVED' ? "bg-green-500" : store.status === 'REJECTED' ? "bg-red-500" : "bg-yellow-500"
        )}>
          {store.status}
        </Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="md:col-span-2 space-y-6">
          {/* Dados da Empresa */}
          <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
            <h2 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-brand-accent" /> Perfil Comercial
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CNPJ</p>
                    <p className="font-bold text-gray-800">{store.cnpj || "Não informado"}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</p>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 capitalize rounded-lg">{meta.category || "N/A"}</Badge>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Telefone</p>
                    <p className="font-bold text-gray-800 flex items-center gap-2"><Phone className="h-4 w-4 text-indigo-400" /> {store.phone}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail</p>
                    <p className="font-bold text-gray-800 flex items-center gap-2"><Mail className="h-4 w-4 text-indigo-400" /> {store.email}</p>
                </div>
            </div>
            
            <Separator className="my-8 bg-gray-50" />
            
            <div className="space-y-4">
                <h3 className="font-black text-indigo-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <MapPin className="h-4 w-4 text-brand-accent" /> Endereço do Estabelecimento
                </h3>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <p className="font-bold text-gray-800">{addr.street}, {addr.number}</p>
                    <p className="text-sm text-gray-500">{addr.neighborhood} - {addr.city}/{addr.state}</p>
                    <p className="text-sm text-gray-500">CEP: {addr.zipCode}</p>
                    {addr.complement && <p className="text-xs text-indigo-400 mt-2 italic">Ref: {addr.complement}</p>}
                </div>
            </div>
          </Card>

          {/* Representante Legal */}
          <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
            <h2 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-brand-accent" /> Representante Legal
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome Completo</p>
                    <p className="font-bold text-gray-800">{legalRep.fullName || "N/A"}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CPF</p>
                    <p className="font-bold text-gray-800">{legalRep.cpf || "N/A"}</p>
                </div>
            </div>
          </Card>

          {/* Dados Bancários */}
          <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
            <h2 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-accent" /> Dados Financeiros
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Banco</p>
                    <p className="font-bold text-gray-800">{bank.bank || "N/A"}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agência</p>
                    <p className="font-bold text-gray-800">{bank.agency}{bank.agencyDigit ? `-${bank.agencyDigit}` : ''}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conta</p>
                    <p className="font-bold text-gray-800">{bank.account}{bank.accountDigit ? `-${bank.accountDigit}` : ''}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</p>
                    <Badge variant="outline" className="capitalize">{bank.accountType === 'checking' ? 'Corrente' : 'Poupança'}</Badge>
                </div>
            </div>
          </Card>
        </div>

        {/* Barra Lateral (Horários e Meta) */}
        <div className="space-y-6">
           <Card className="rounded-[2rem] border-none shadow-sm bg-indigo-900 text-white p-8">
              <h3 className="font-black text-lg mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-300" /> Horários
              </h3>
              <div className="space-y-4">
                {Object.entries(hours).map(([day, data]: [string, any]) => (
                  <div key={day} className="flex justify-between items-center border-b border-white/10 pb-2 last:border-0">
                    <span className="text-xs font-bold text-indigo-200">{dayLabels[day]}</span>
                    {data.closed ? (
                      <span className="text-[10px] font-black uppercase text-white/40">Fechado</span>
                    ) : (
                      <div className="text-right">
                        {data.windows.map((w: any) => (
                          <p key={w.id} className="text-xs font-black">{w.open} - {w.close}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
           </Card>

           <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
              <h3 className="font-black text-indigo-900 text-sm uppercase tracking-widest mb-6">Operação Logística</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl"><Globe className="h-6 w-6 text-indigo-400" /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Raio de Entrega</p>
                        <p className="font-bold text-gray-800">{meta.delivery_area?.radius || 0} KM</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl"><ShieldCheck className="h-6 w-6 text-indigo-400" /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modo de Entrega</p>
                        <p className="font-bold text-gray-800">{meta.delivery_area?.delivery_mode === 'OWN' ? 'Entregador Próprio' : 'Rede do App'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl"><Calendar className="h-6 w-6 text-indigo-400" /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cadastrado em</p>
                        <p className="font-bold text-gray-800">{new Date(store.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default StoreDetailPage;