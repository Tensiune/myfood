"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Bike, 
  User, 
  CreditCard, 
  MapPin, 
  FileText, 
  Car, 
  Loader2,
  ExternalLink,
  Lock
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";

const ValidateDriversPage = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('driver_applications')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      showError("Erro ao carregar entregadores.");
    } else {
      setDrivers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleViewDocument = async (path: string) => {
      if (!path) return;
      
      const tid = showLoading("Gerando acesso seguro...");
      try {
          // Chamada para a Edge Function que tem privilégios de administrador
          const { data, error } = await supabase.functions.invoke('get-secure-document', {
              body: { filePath: path }
          });

          if (error || !data?.signedUrl) throw new Error(error?.message || "Não foi possível gerar o link.");

          window.open(data.signedUrl, '_blank');
      } catch (err: any) {
          console.error(err);
          showError("Erro de acesso: Verifique se o documento existe no servidor.");
      } finally {
          dismissToast(tid);
      }
  };

  const handleAction = async (userId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setProcessingId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('manage-merchant', {
        body: { userId, status: newStatus, type: 'DRIVER' }
      });

      if (error) throw error;

      showSuccess(newStatus === 'APPROVED' ? "Entregador aprovado!" : "Cadastro rejeitado.");
      setDrivers(prev => prev.filter(d => d.id !== userId));
    } catch (error: any) {
      showError("Erro ao processar ação: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Buscando cadastros de entregadores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">Validar Entregadores</h1>
          <p className="text-gray-500">Analise documentos com visualização protegida.</p>
        </div>
        <Badge className="bg-blue-600 text-white px-4 py-1.5 rounded-full">{drivers.length} Pendentes</Badge>
      </div>

      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold">Entregador</TableHead>
              <TableHead className="font-bold">Veículo</TableHead>
              <TableHead className="font-bold">CPF</TableHead>
              <TableHead className="text-right font-bold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20 text-gray-400 font-medium">
                  Nenhum entregador aguardando aprovação.
                </TableCell>
              </TableRow>
            ) : (
              drivers.map((driver) => (
                <TableRow key={driver.id} className="hover:bg-blue-50/30 transition-colors">
                  <TableCell>
                    <div className="font-bold text-gray-800">{driver.full_name || "Sem Nome"}</div>
                    <div className="text-xs text-gray-500">{driver.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-blue-600 border-blue-100 bg-blue-50">
                      {driver.metadata?.vehicle?.type || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-600">{driver.cpf || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full text-blue-600 hover:bg-blue-50">
                          <Eye className="h-5 w-5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[2.5rem] sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl h-[90vh] flex flex-col">
                        <DialogHeader className="p-8 bg-blue-600 text-white shrink-0">
                          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Bike className="h-6 w-6" /> Análise de Entregador
                          </DialogTitle>
                          <DialogDescription>
                            Revise os dados pessoais, do veículo e os documentos enviados pelo entregador.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <ScrollArea className="flex-1 p-8 bg-white">
                          <div className="space-y-8 pb-8">
                            <div className="flex items-center gap-4 bg-blue-50 p-6 rounded-3xl">
                              <div className="bg-white p-4 rounded-2xl shadow-sm"><User className="h-10 w-10 text-blue-600" /></div>
                              <div>
                                <h4 className="font-black text-xl text-blue-900">{driver.full_name}</h4>
                                <p className="text-sm text-blue-500 font-medium">{driver.email}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-5 bg-gray-50 rounded-2xl space-y-2">
                                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  <MapPin className="h-3 w-3" /> Endereço
                                </div>
                                <p className="text-sm font-bold text-gray-700 leading-tight">
                                  {driver.metadata?.address?.street}, {driver.metadata?.address?.number}<br/>
                                  {driver.metadata?.address?.neighborhood} - {driver.metadata?.address?.city}/{driver.metadata?.address?.state}
                                </p>
                              </div>
                              <div className="p-5 bg-gray-50 rounded-2xl space-y-2">
                                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  <CreditCard className="h-3 w-3" /> Dados Bancários
                                </div>
                                <p className="text-sm font-bold text-gray-700">
                                  Banco: {driver.metadata?.bank_info?.bank}<br/>
                                  Ag: {driver.metadata?.bank_info?.agency} / Conta: {driver.metadata?.bank_info?.account}
                                </p>
                              </div>
                            </div>

                            <div className="p-6 border-2 border-blue-100 rounded-3xl bg-blue-50/20">
                              <h5 className="font-black text-blue-900 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Car className="h-4 w-4" /> Informações do Veículo
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Tipo</p><p className="font-black text-gray-800 capitalize">{driver.metadata?.vehicle?.type}</p></div>
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Placa</p><p className="font-black text-gray-800">{driver.metadata?.vehicle?.plate || 'N/A'}</p></div>
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Marca/Modelo</p><p className="font-black text-gray-800">{driver.metadata?.vehicle?.brand} {driver.metadata?.vehicle?.model}</p></div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h5 className="font-black text-gray-900 text-sm uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-indigo-500" /> Documentos Pessoais
                                </h5>
                                <Badge variant="outline" className="text-[10px] gap-1 border-indigo-100 text-indigo-600">
                                    <Lock className="h-2 w-2" /> Visualização Protegida
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {driver.metadata?.documents?.cnhUrl && (
                                  <Button 
                                    variant="outline" 
                                    className="h-16 rounded-2xl flex items-center justify-between px-4 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                    onClick={() => handleViewDocument(driver.metadata.documents.cnhUrl)}
                                  >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-white"><FileText className="h-4 w-4 text-gray-500" /></div>
                                        <span className="font-bold text-sm text-gray-700">Ver CNH</span>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-600" />
                                  </Button>
                                )}
                                {driver.metadata?.documents?.vehicleDocUrl && (
                                  <Button 
                                    variant="outline" 
                                    className="h-16 rounded-2xl flex items-center justify-between px-4 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                    onClick={() => handleViewDocument(driver.metadata.documents.vehicleDocUrl)}
                                  >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-white"><Car className="h-4 w-4 text-gray-500" /></div>
                                        <span className="font-bold text-sm text-gray-700">Ver CRLV</span>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-600" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                              <Button 
                                className="flex-1 bg-red-500 hover:bg-red-600 rounded-2xl gap-2 h-14 font-bold" 
                                onClick={() => handleAction(driver.id, 'REJECTED')}
                                disabled={processingId === driver.id}
                              >
                                <XCircle className="h-5 w-5" /> Rejeitar
                              </Button>
                              <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700 rounded-2xl gap-2 h-14 font-bold" 
                                onClick={() => handleAction(driver.id, 'APPROVED')}
                                disabled={processingId === driver.id}
                              >
                                {processingId === driver.id ? <Loader2 className="animate-spin h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                                Aprovar Parceiro
                              </Button>
                            </div>
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ValidateDriversPage;