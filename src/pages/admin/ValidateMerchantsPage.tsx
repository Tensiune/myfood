"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showSuccess, showError } from "@/utils/toast";
import { CheckCircle2, XCircle, Eye, Building2, MapPin, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ValidateMerchantsPage = () => {
  // Dados mockados de lojistas pendentes
  const [merchants, setMerchants] = useState([
    { id: "1", name: "Sushi do Porto", email: "contato@sushiporto.com", cuisine: "Japonesa", cnpj: "12.345.678/0001-90", status: "PENDING", date: "10/05/2024" },
    { id: "2", name: "Burguer King (Franquia 01)", email: "gestao@bk-local.com", cuisine: "Hamburguer", cnpj: "98.765.432/0001-11", status: "PENDING", date: "11/05/2024" },
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
              <TableHead className="font-bold">CNPJ</TableHead>
              <TableHead className="text-right font-bold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-500 font-medium">
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
                  <TableCell className="text-sm font-mono">{merchant.cnpj}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full text-indigo-600">
                            <Eye className="h-5 w-5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Detalhes do Parceiro</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6 py-4">
                            <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-2xl">
                              <div className="bg-white p-3 rounded-xl shadow-sm"><Building2 className="h-8 w-8 text-indigo-600" /></div>
                              <div>
                                <h4 className="font-bold text-lg text-indigo-900">{merchant.name}</h4>
                                <p className="text-sm text-gray-600">{merchant.email}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Documento</p>
                                <p className="font-medium text-sm">{merchant.cnpj}</p>
                              </div>
                              <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Especialidade</p>
                                <p className="font-medium text-sm">{merchant.cuisine}</p>
                              </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                              <Button className="flex-1 bg-red-500 hover:bg-red-600 rounded-xl gap-2 h-12" onClick={() => handleReject(merchant.id)}>
                                <XCircle className="h-5 w-5" /> Rejeitar
                              </Button>
                              <Button className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl gap-2 h-12" onClick={() => handleApprove(merchant.id)}>
                                <CheckCircle2 className="h-5 w-5" /> Aprovar Loja
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" className="rounded-full text-green-600" onClick={() => handleApprove(merchant.id)}>
                        <CheckCircle2 className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-full text-red-500" onClick={() => handleReject(merchant.id)}>
                        <XCircle className="h-5 w-5" />
                      </Button>
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