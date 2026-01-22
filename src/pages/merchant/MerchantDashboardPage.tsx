"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  Clock, 
  Users, 
  CreditCard, 
  Menu as MenuIcon, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

const MerchantDashboardPage = () => {
  // Status da loja
  const [isOpen, setIsOpen] = useState(true);
  
  // Horário de funcionamento
  const [schedule, setSchedule] = useState({
    monday: { open: "08:00", close: "22:00" },
    tuesday: { open: "08:00", close: "22:00" },
    wednesday: { open: "08:00", close: "22:00" },
    thursday: { open: "08:00", close: "22:00" },
    friday: { open: "08:00", close: "23:00" },
    saturday: { open: "09:00", close: "23:00" },
    sunday: { open: "09:00", close: "20:00" }
  });
  
  // Dados da loja
  const [storeInfo, setStoreInfo] = useState({
    name: "Minha Loja",
    description: "Descrição da minha loja",
    address: "Rua Exemplo, 123",
    phone: "(11) 99999-9999"
  });
  
  // Acessos para colaboradores
  const [collaborators, setCollaborators] = useState([
    { id: "1", name: "João Silva", email: "joao@loja.com", role: "Gerente" },
    { id: "2", name: "Maria Santos", email: "maria@loja.com", role: "Atendente" }
  ]);
  
  const [newCollaborator, setNewCollaborator] = useState({ name: "", email: "", role: "Atendente" });
  
  // Dados bancários
  const [bankInfo, setBankInfo] = useState({
    bank: "",
    accountType: "checking",
    agency: "",
    agencyDigit: "",
    account: "",
    accountDigit: ""
  });
  
  // Status de conclusão
  const [isCompleted, setIsCompleted] = useState(false);

  const handleScheduleChange = (day: string, type: string, value: string) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day as keyof typeof schedule],
        [type]: value
      }
    });
  };

  const handleAddCollaborator = () => {
    if (!newCollaborator.name || !newCollaborator.email) {
      showError("Preencha todos os campos do colaborador");
      return;
    }
    
    setCollaborators([
      ...collaborators,
      {
        id: Date.now().toString(),
        ...newCollaborator
      }
    ]);
    
    setNewCollaborator({ name: "", email: "", role: "Atendente" });
    showSuccess("Colaborador adicionado com sucesso!");
  };

  const handleRemoveCollaborator = (id: string) => {
    setCollaborators(collaborators.filter(c => c.id !== id));
    showSuccess("Colaborador removido!");
  };

  const handleSaveBankInfo = () => {
    if (!bankInfo.bank || !bankInfo.agency || !bankInfo.account) {
      showError("Preencha todos os campos bancários obrigatórios");
      return;
    }
    
    showSuccess("Informações bancárias salvas!");
  };

  const handleSubmitForApproval = () => {
    // Verificar se todas as etapas foram concluídas
    const isScheduleComplete = Object.values(schedule).every(
      s => s.open && s.close
    );
    
    const isBankInfoComplete = bankInfo.bank && bankInfo.agency && bankInfo.account;
    
    if (!isScheduleComplete) {
      showError("Preencha o horário de funcionamento para todos os dias");
      return;
    }
    
    if (!isBankInfoComplete) {
      showError("Preencha todas as informações bancárias");
      return;
    }
    
    setIsCompleted(true);
    showSuccess("Cadastro enviado para aprovação!");
  };

  const getDayName = (day: string) => {
    const days: Record<string, string> = {
      monday: "Segunda",
      tuesday: "Terça",
      wednesday: "Quarta",
      thursday: "Quinta",
      friday: "Sexta",
      saturday: "Sábado",
      sunday: "Domingo"
    };
    return days[day] || day;
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Configuração da Loja</h1>
          <p className="text-gray-500">Configure todas as informações da sua loja</p>
        </div>
        <Badge className={`px-4 py-2 rounded-full ${isOpen ? "bg-green-500" : "bg-red-500"}`}>
          {isOpen ? "Loja Aberta" : "Loja Fechada"}
        </Badge>
      </div>

      {/* Status da Loja */}
      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-indigo-900">
            <Store className="h-5 w-5" /> Status da Loja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div>
              <h3 className="font-bold text-gray-800">Status Atual</h3>
              <p className="text-sm text-gray-500">Controle se sua loja está aberta para pedidos</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={isOpen ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                {isOpen ? "Aberta" : "Fechada"}
              </span>
              <Switch 
                checked={isOpen} 
                onCheckedChange={setIsOpen}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horário de Funcionamento */}
      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-indigo-900">
            <Clock className="h-5 w-5" /> Horário de Funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(schedule).map(([day, hours]) => (
              <div key={day} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <span className="font-medium text-gray-800">{getDayName(day)}</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={hours.open}
                    onChange={(e) => handleScheduleChange(day, "open", e.target.value)}
                    className="w-24 rounded-lg h-10"
                  />
                  <span className="text-gray-500">-</span>
                  <Input
                    type="time"
                    value={hours.close}
                    onChange={(e) => handleScheduleChange(day, "close", e.target.value)}
                    className="w-24 rounded-lg h-10"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Minha Loja */}
      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-indigo-900">
            <Store className="h-5 w-5" /> Minha Loja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Loja</Label>
              <Input
                value={storeInfo.name}
                onChange={(e) => setStoreInfo({...storeInfo, name: e.target.value})}
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={storeInfo.phone}
                onChange={(e) => setStoreInfo({...storeInfo, phone: e.target.value})}
                className="rounded-xl h-12"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={storeInfo.description}
              onChange={(e) => setStoreInfo({...storeInfo, description: e.target.value})}
              className="rounded-xl h-12"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={storeInfo.address}
              onChange={(e) => setStoreInfo({...storeInfo, address: e.target.value})}
              className="rounded-xl h-12"
            />
          </div>
          
          <div className="pt-4">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" /> Acessos para Colaboradores
            </h3>
            
            <div className="space-y-3 mb-6">
              {collaborators.map((collab) => (
                <div key={collab.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-medium text-gray-800">{collab.name}</p>
                    <p className="text-sm text-gray-600">{collab.email} • {collab.role}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveCollaborator(collab.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-indigo-50 rounded-2xl">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={newCollaborator.name}
                  onChange={(e) => setNewCollaborator({...newCollaborator, name: e.target.value})}
                  placeholder="Nome do colaborador"
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  value={newCollaborator.email}
                  onChange={(e) => setNewCollaborator({...newCollaborator, email: e.target.value})}
                  placeholder="E-mail do colaborador"
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select 
                  value={newCollaborator.role}
                  onValueChange={(value) => setNewCollaborator({...newCollaborator, role: value})}
                >
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gerente">Gerente</SelectItem>
                    <SelectItem value="Atendente">Atendente</SelectItem>
                    <SelectItem value="Cozinheiro">Cozinheiro</SelectItem>
                    <SelectItem value="Entregador">Entregador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Button 
                  onClick={handleAddCollaborator}
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Colaborador
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Financeiras */}
      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-indigo-900">
            <CreditCard className="h-5 w-5" /> Informações Financeiras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input
                value={bankInfo.bank}
                onChange={(e) => setBankInfo({...bankInfo, bank: e.target.value})}
                placeholder="Nome do banco"
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Conta</Label>
              <Select 
                value={bankInfo.accountType}
                onValueChange={(value) => setBankInfo({...bankInfo, accountType: value})}
              >
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Conta Corrente</SelectItem>
                  <SelectItem value="savings">Conta Poupança</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Agência</Label>
              <Input
                value={bankInfo.agency}
                onChange={(e) => setBankInfo({...bankInfo, agency: e.target.value})}
                placeholder="Número da agência"
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Dígito</Label>
              <Input
                value={bankInfo.agencyDigit}
                onChange={(e) => setBankInfo({...bankInfo, agencyDigit: e.target.value})}
                placeholder="Dígito"
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Input
                value={bankInfo.account}
                onChange={(e) => setBankInfo({...bankInfo, account: e.target.value})}
                placeholder="Número da conta"
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Dígito</Label>
              <Input
                value={bankInfo.accountDigit}
                onChange={(e) => setBankInfo({...bankInfo, accountDigit: e.target.value})}
                placeholder="Dígito"
                className="rounded-xl h-12"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSaveBankInfo}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700"
          >
            Salvar Informações Bancárias
          </Button>
        </CardContent>
      </Card>

      {/* Cardápio */}
      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-indigo-900">
            <MenuIcon className="h-5 w-5" /> Cardápio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <MenuIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Gerencie seu cardápio</h3>
            <p className="text-gray-600 mb-6">
              Adicione categorias, produtos e variações para seus clientes
            </p>
            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
              <Edit className="h-4 w-4 mr-2" /> Configurar Cardápio
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conclusão */}
      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-8">
          <div className="text-center">
            {isCompleted ? (
              <div className="space-y-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Cadastro Enviado!</h3>
                <p className="text-gray-600">
                  Seu cadastro foi enviado para análise. Entraremos em contato em até 2 dias úteis.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${isCompleted ? "bg-green-100" : "bg-indigo-100"}`}>
                  {isCompleted ? (
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  ) : (
                    <AlertCircle className="h-12 w-12 text-indigo-600" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {isCompleted ? "Cadastro Concluído!" : "Pronto para enviar?"}
                </h3>
                <p className="text-gray-600">
                  Verifique se todas as informações estão corretas antes de enviar para aprovação.
                </p>
                <Button 
                  onClick={handleSubmitForApproval}
                  className="mt-6 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-6 text-lg w-full max-w-md mx-auto"
                  disabled={isCompleted}
                >
                  {isCompleted ? "Enviado para Aprovação" : "Enviar para Aprovação"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantDashboardPage;