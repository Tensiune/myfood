"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showSuccess, showError } from "@/utils/toast";
import { CheckCircle2, XCircle, Eye, Building2, MapPin, Clock, CreditCard, Map as MapIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";

const ValidateMerchantsPage = () => {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchMerchants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('merchant_applications')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      showError("Erro ao carregar lojistas.");
    } else {
      setMerchants(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const handleAction = async (userId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setProcessingId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('manage-merchant', {
        body: { userId, status: newStatus }
      });

      if (error) throw error;

      showSuccess(newStatus === 'APPROVED' ? "Lojista aprovado!" : "Cadastro rejeitado.");
      setMerchants(prev => prev.filter(m => m.id !== userId));
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
        <p className="text-gray-500 font-bold">Buscando solicitações reais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">Validar Parceiros</h1>
          <p className="text-gray-500">Analise os novos cadastros vinculados ao banco de dados.</p>
        </div>
        <Badge className="bg-brand-accent px-4 py-1.5 rounded-full">{merchants.length} Pendentes</Badge>
      </div>

      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold">Loja</TableHead>
              <TableHead className="font-bold">CNPJ</TableHead>
              <TableHead className="font-bold">Data Cadastro</TableHead>
              <TableHead className="text-right font-bold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20 text-gray-400 font-medium">
                  Nenhuma solicitação pendente no momento.
                </TableCell>
              </TableRow>
            ) : (
              merchants.map((merchant) => (
                <TableRow key={merchant.id} className="hover:bg-indigo-50/30 transition-colors">
                  <TableCell>
                    <div className="font-bold text-gray-800">{merchant.store_name || "Sem Nome"}</div>
                    <div className="text-xs text-gray-500">{merchant.email}</div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-600">{merchant.cnpj || 'Não informado'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{new Date(merchant.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full text-indigo-600 hover:bg-indigo-50">
                            <Eye className="h-5 w-5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[2.5rem] sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl h-[85vh] flex flex-col">
                          <DialogHeader className="p-8 bg-indigo-900 text-white shrink-0">
                            <DialogTitle className="text-2xl font-bold">Análise de Parceiro</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="flex-1 p-8 bg-white">
                            <div className="space-y-8">
                              <div className="flex items-center gap-4 bg-indigo-50 p-6 rounded-3xl">
                                <div className="bg-white p-4 rounded-2xl shadow-sm"><Building2 className="h-10 w-10 text-indigo-600" /></div>
                                <div>
                                  <h4 className="font-black text-xl text-indigo-900">{merchant.store_name}</h4>
                                  <p className="text-sm text-gray-500 font-medium">{merchant.cnpj}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-4">
                                <div className="p-5 bg-gray-50 rounded-2xl flex items-start gap-4">
                                  <MapPin className="h-5 w-5 text-indigo-400 mt-1" />
                                  <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Localização</p>
                                    <p className="font-bold text-gray-700 leading-tight">
                                        {merchant.metadata?.address?.street}, {merchant.metadata?.address?.number}
                                    </p>
                                  </div>
                                </div>
                                <div className="p-5 bg-gray-50 rounded-2xl flex items-start gap-4">
                                  <Clock className="h-5 w-5 text-indigo-400 mt-1" />
                                  <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contato</p>
                                    <p className="font-bold text-gray-700">{merchant.phone || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-4 pt-4 pb-8">
                                <Button 
                                  className="flex-1 bg-red-500 hover:bg-red-600 rounded-2xl gap-2 h-14 font-bold" 
                                  onClick={() => handleAction(merchant.id, 'REJECTED')}
                                  disabled={processingId === merchant.id}
                                >
                                  <XCircle className="h-5 w-5" /> Rejeitar
                                </Button>
                                <Button 
                                  className="flex-1 bg-green-600 hover:bg-green-700 rounded-2xl gap-2 h-14 font-bold" 
                                  onClick={() => handleAction(merchant.id, 'APPROVED')}
                                  disabled={processingId === merchant.id}
                                >
                                  {processingId === merchant.id ? <Loader2 className="animate-spin h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                                  Aprovar Loja
                                </Button>
                              </div>
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
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

export default ValidateMerchantsPage;