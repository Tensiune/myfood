"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  User, 
  Bike, 
  MapPin, 
  CreditCard, 
  FileText, 
  Phone,
  Mail,
  Loader2,
  Calendar,
  ShieldCheck,
  ExternalLink,
  Car
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError, showLoading, dismissToast } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";

const DriverDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<any>(null);

  useEffect(() => {
    const fetchDriver = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase.from('driver_applications').select('*').eq('id', id).single();
        if (error) throw error;
        setDriver(data);
      } catch (err: any) {
        showError("Entregador não encontrado.");
        navigate("/admin/drivers-management");
      } finally {
        setLoading(false);
      }
    };
    fetchDriver();
  }, [id, navigate]);

  const handleViewDocument = async (path: string) => {
    if (!path) return;
    const tid = showLoading("Gerando acesso seguro...");
    try {
        const { data, error } = await supabase.functions.invoke('get-secure-document', {
            body: { filePath: path }
        });
        if (error || !data?.signedUrl) throw new Error(error?.message || "Erro no servidor.");
        window.open(data.signedUrl, '_blank');
    } catch (err: any) {
        showError("Falha ao abrir documento.");
    } finally {
        dismissToast(tid);
    }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>;
  if (!driver) return null;

  const meta = driver.metadata || {};
  const addr = meta.address || {};
  const vehicle = meta.vehicle || {};
  const docs = meta.documents || {};
  const bank = meta.bank_info || {};

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-white shadow-sm"><ArrowLeft /></Button>
          <div>
            <h1 className="text-2xl font-black text-indigo-900">{driver.full_name}</h1>
            <p className="text-sm text-gray-500">ID: {driver.id}</p>
          </div>
        </div>
        <Badge className={cn(
            "rounded-full px-4 py-1.5 text-xs font-bold",
            driver.status === 'APPROVED' ? "bg-green-500" : driver.status === 'REJECTED' ? "bg-red-500" : "bg-yellow-500"
        )}>
          {driver.status}
        </Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Dados Pessoais e Endereço */}
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
            <h2 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-brand-accent" /> Perfil do Entregador
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CPF</p>
                    <p className="font-bold text-gray-800">{driver.cpf}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Telefone</p>
                    <p className="font-bold text-gray-800 flex items-center gap-2"><Phone className="h-4 w-4 text-indigo-400" /> {driver.phone}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail</p>
                    <p className="font-bold text-gray-800 flex items-center gap-2"><Mail className="h-4 w-4 text-indigo-400" /> {driver.email}</p>
                </div>
            </div>
            
            <Separator className="my-8 bg-gray-50" />
            
            <div className="space-y-4">
                <h3 className="font-black text-indigo-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <MapPin className="h-4 w-4 text-brand-accent" /> Endereço Residencial
                </h3>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <p className="font-bold text-gray-800">{addr.street}, {addr.number}</p>
                    <p className="text-sm text-gray-500">{addr.neighborhood} - {addr.city}/{addr.state}</p>
                    <p className="text-sm text-gray-500">CEP: {addr.zipCode}</p>
                </div>
            </div>
          </Card>

          {/* Documentos */}
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
            <h2 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-accent" /> Documentação Enviada
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {docs.cnhUrl && (
                    <Button variant="outline" className="h-16 rounded-2xl justify-between border-gray-100 hover:bg-indigo-50" onClick={() => handleViewDocument(docs.cnhUrl)}>
                        <span className="font-bold">Visualizar CNH</span>
                        <ExternalLink className="h-4 w-4 opacity-30" />
                    </Button>
                )}
                {docs.vehicleDocUrl && (
                    <Button variant="outline" className="h-16 rounded-2xl justify-between border-gray-100 hover:bg-indigo-50" onClick={() => handleViewDocument(docs.vehicleDocUrl)}>
                        <span className="font-bold">Visualizar CRLV</span>
                        <ExternalLink className="h-4 w-4 opacity-30" />
                    </Button>
                )}
            </div>
          </Card>

          {/* Dados Bancários */}
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
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
                    <p className="font-bold text-gray-800">{bank.agency}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conta</p>
                    <p className="font-bold text-gray-800">{bank.account}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chave PIX</p>
                    <p className="font-bold text-gray-800 truncate">{bank.pix || "N/A"}</p>
                </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
           <Card className="rounded-[2.5rem] border-none shadow-sm bg-indigo-900 text-white p-8">
              <h3 className="font-black text-lg mb-6 flex items-center gap-2">
                <Car className="h-5 w-5 text-indigo-300" /> Veículo
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-xs text-indigo-200">Tipo</span>
                    <span className="text-sm font-black uppercase">{vehicle.type}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-xs text-indigo-200">Placa</span>
                    <span className="text-sm font-black">{vehicle.plate || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-xs text-indigo-200">Marca</span>
                    <span className="text-sm font-black">{vehicle.brand}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-xs text-indigo-200">Modelo</span>
                    <span className="text-sm font-black">{vehicle.model}</span>
                </div>
              </div>
           </Card>

           <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
              <h3 className="font-black text-indigo-900 text-sm uppercase tracking-widest mb-6">Informações Extras</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl"><ShieldCheck className="h-6 w-6 text-indigo-400" /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exclusividade</p>
                        <p className="font-bold text-gray-800">{meta.is_exclusive ? 'Frotista Fixo' : 'Rede Pública'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl"><Calendar className="h-6 w-6 text-indigo-400" /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membro desde</p>
                        <p className="font-bold text-gray-800">{new Date(driver.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default DriverDetailPage;