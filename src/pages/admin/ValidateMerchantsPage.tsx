"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showSuccess, showError } from "@/utils/toast";
import { CheckCircle2, XCircle, Eye, Building2, MapPin, Clock, CreditCard, Map as MapIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const ValidateMerchantsPage = () => {
  // Dados simulando o que vem do Supabase (user_metadata)
  const [merchants, setMerchants] = useState([
    { 
      id: "1", 
      name: "Sushi do Porto", 
      email: "contato@sushiporto.com", 
      cuisine: "Japonesa", 
      cnpj: "12.345.678/0001-90", 
      status: "PENDING", 
      date: "10/05/2024",
      details: {
        phone: "(11) 98888-7777",
        address: "Rua das Flores, 123 - Centro, São Paulo/SP",
        hours: "Seg a Sex: 08:00 - 22:00",
        delivery: "Raio de 5km",
        bank: "Itaú - Ag: 0001 / CC: 12345-6"
      }
    },
    { 
      id: "2", 
      name: "Burguer King (Franquia 01)", 
      email: "gestao@bk-local.com", 
      cuisine: "Hamburguer", 
      cnpj: "98.765.432/0001-11", 
      status: "PENDING", 
      date: "11/05/2024",
      details: {
        phone: "(11) 97777-6666",
        address: "Av. Paulista, 1000 - Bela Vista, São Paulo/SP",
        hours: "Todos os dias: 11:00 - 00:00",
        delivery: "Raio de 10km",
        bank: "Santander - Ag: 1234 / CC: 98765-4"
      }
    },
  ]);

  const handleApprove = (id: string) => {
    setMerchants(prev => prev.filter(m => m.id !== id));
    showSuccess("Lojista aprovado com sucesso! Ele agora pode acessar o painel.");
  };

  const handleReject = (id: string) => {
    setMerchants(prev => prev.filter(m => m.id !== id));
    showError("Cadastro rejeitado.");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">Validar Parceiros</h1>
          <p className="text-gray-500">Analise os novos cadastros antes de liberá-los na plataforma.</p>
        </div>
        <Badge className="bg-brand-accent px-4 py-1.5 rounded-full">{merchants.length} Pendentes</Badge>
      </div>

      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold">Loja</TableHead>
              <TableHead className="font-bold">Cozinha</TableHead>
              <TableHead className="font-bold">Data Cadastro</TableHead>
              <TableHead className="text-right font-bold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-gray-500 font-medium">
                  Nenhum cadastro aguardando validação no momento.
                </TableCell>
              </TableRow>
            ) : (
              merchants.map((merchant) => (
                <TableRow key={merchant.id} className="hover:bg-indigo-50/30 transition-colors">
                  <TableCell>
                    <div className="font-bold text-gray-800">{merchant.name}</div>
                    <div className="text-xs text-gray-500">{merchant.email}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="rounded-lg">{merchant.cuisine}</Badge></TableCell>
                  <TableCell className="text-sm text-gray-600">{merchant.date}</TableCell>
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
                              {/* Store Header */}
                              <div className="flex items-center gap-4 bg-indigo-50 p-6 rounded-3xl">
                                <div className="bg-white p-4 rounded-2xl shadow-sm"><Building2 className="h-10 w-10 text-indigo-600" /></div>
                                <div>
                                  <h4 className="font-black text-xl text-indigo-900">{merchant.name}</h4>
                                  <p className="text-sm text-gray-500 font-medium">{merchant.cnpj}</p>
                                </div>
                              </div>

                              {/* Detailed Info Grid */}
                              <div className="grid grid-cols-1 gap-4">
                                <div className="p-5 bg-gray-50 rounded-2xl flex items-start gap-4">
                                  <MapPin className="h-5 w-5 text-indigo-400 mt-1" />
                                  <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Localização</p>
                                    <p className="font-bold text-gray-700 leading-tight">{merchant.details.address}</p>
                                  </div>
                                </div>

                                <div className="p-5 bg-gray-50 rounded-2xl flex items-start gap-4">
                                  <Clock className="h-5 w-5 text-indigo-400 mt-1" />
                                  <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Horários</p>
                                    <p className="font-bold text-gray-700">{merchant.details.hours}</p>
                                  </div>
                                </div>

                                <div className="p-5 bg-gray-50 rounded-2xl flex items-start gap-4">
                                  <MapIcon className="h-5 w-5 text-indigo-400 mt-1" />
                                  <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Logística</p>
                                    <p className="font-bold text-gray-700">{merchant.details.delivery}</p>
                                  </div>
                                </div>

                                <div className="p-5 bg-gray-50 rounded-2xl flex items-start gap-4">
                                  <CreditCard className="h-5 w-5 text-indigo-400 mt-1" />
                                  <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dados Bancários</p>
                                    <p className="font-bold text-gray-700">{merchant.details.bank}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-4 pt-4 pb-8">
                                <Button className="flex-1 bg-red-500 hover:bg-red-600 rounded-2xl gap-2 h-14 font-bold" onClick={() => handleReject(merchant.id)}>
                                  <XCircle className="h-5 w-5" /> Rejeitar
                                </Button>
                                <Button className="flex-1 bg-green-600 hover:bg-green-700 rounded-2xl gap-2 h-14 font-bold" onClick={() => handleApprove(merchant.id)}>
                                  <CheckCircle2 className="h-5 w-5" /> Aprovar Loja
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