"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, MapPin, Home, Building, Map } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

interface Address {
  id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  type: "home" | "work" | "other";
  isDefault: boolean;
}

const AddressManager: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<Partial<Address>>({
    type: "home",
    isDefault: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Carregar endereços do localStorage
  useEffect(() => {
    const savedAddresses = localStorage.getItem("deliveryAddresses");
    if (savedAddresses) {
      try {
        setAddresses(JSON.parse(savedAddresses));
      } catch (error) {
        console.error("Failed to parse addresses from localStorage", error);
      }
    }
  }, []);

  // Salvar endereços no localStorage
  useEffect(() => {
    if (addresses.length > 0) {
      localStorage.setItem("deliveryAddresses", JSON.stringify(addresses));
    }
  }, [addresses]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setCurrentAddress(prev => ({ ...prev, type: value as "home" | "work" | "other" }));
  };

  const handleSaveAddress = () => {
    if (!currentAddress.street || !currentAddress.number || !currentAddress.neighborhood ||
        !currentAddress.city || !currentAddress.state || !currentAddress.zipCode) {
      showError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (editingId) {
      // Atualizar endereço existente
      setAddresses(prev =>
        prev.map(addr =>
          addr.id === editingId ? { ...currentAddress, id: editingId } as Address : addr
        )
      );
      showSuccess("Endereço atualizado com sucesso!");
    } else {
      // Adicionar novo endereço
      const newAddress: Address = {
        id: Date.now().toString(),
        street: currentAddress.street!,
        number: currentAddress.number!,
        complement: currentAddress.complement || "",
        neighborhood: currentAddress.neighborhood!,
        city: currentAddress.city!,
        state: currentAddress.state!,
        zipCode: currentAddress.zipCode!,
        type: currentAddress.type!,
        isDefault: currentAddress.isDefault || false,
      };

      // Se for marcado como padrão, desmarcar os outros
      if (newAddress.isDefault) {
        setAddresses(prev =>
          prev.map(addr => ({ ...addr, isDefault: false }))
        );
      }

      setAddresses(prev => [...prev, newAddress]);
      showSuccess("Endereço adicionado com sucesso!");
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentAddress({
      type: "home",
      isDefault: false,
    });
    setEditingId(null);
  };

  const handleEditAddress = (address: Address) => {
    setCurrentAddress(address);
    setEditingId(address.id);
    setIsDialogOpen(true);
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses(prev => prev.filter(addr => addr.id !== id));
    showSuccess("Endereço removido com sucesso!");
  };

  const handleSetDefault = (id: string) => {
    setAddresses(prev =>
      prev.map(addr =>
        addr.id === id ? { ...addr, isDefault: true } : { ...addr, isDefault: false }
      )
    );
    showSuccess("Endereço padrão atualizado!");
  };

  const getDefaultAddress = () => {
    return addresses.find(addr => addr.isDefault) || addresses[0];
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-indigo-800">Endereços de Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {addresses.length === 0 ? (
            <p className="text-center text-gray-600 py-8">
              Você ainda não adicionou nenhum endereço de entrega.
            </p>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <Card key={address.id} className="rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        {address.type === "home" && <Home className="h-5 w-5 text-indigo-600 mt-0.5" />}
                        {address.type === "work" && <Building className="h-5 w-5 text-indigo-600 mt-0.5" />}
                        {address.type === "other" && <MapPin className="h-5 w-5 text-indigo-600 mt-0.5" />}
                        <div>
                          <p className="font-medium text-gray-800">
                            {address.street}, {address.number}
                            {address.complement && `, ${address.complement}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {address.neighborhood} - {address.city}/{address.state}
                          </p>
                          <p className="text-sm text-gray-500">CEP: {address.zipCode}</p>
                          {address.isDefault && (
                            <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-1 rounded-full mt-1">
                              Padrão
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                          onClick={() => handleEditAddress(address)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteAddress(address.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {!address.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 rounded-lg border-green-200 text-green-600 hover:bg-green-50"
                            onClick={() => handleSetDefault(address.id)}
                          >
                            Tornar Padrão
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-2">
                <Plus className="h-4 w-4 mr-2" /> Adicionar Endereço
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-indigo-800">
                  {editingId ? "Editar Endereço" : "Adicionar Novo Endereço"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-gray-700">CEP</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      placeholder="00000-000"
                      value={currentAddress.zipCode || ""}
                      onChange={handleInputChange}
                      className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-gray-700">Tipo</Label>
                    <Select value={currentAddress.type} onValueChange={handleSelectChange}>
                      <SelectTrigger className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-md">
                        <SelectItem value="home">Casa</SelectItem>
                        <SelectItem value="work">Trabalho</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="street" className="text-gray-700">Rua</Label>
                    <Input
                      id="street"
                      name="street"
                      placeholder="Nome da rua"
                      value={currentAddress.street || ""}
                      onChange={handleInputChange}
                      className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number" className="text-gray-700">Número</Label>
                    <Input
                      id="number"
                      name="number"
                      placeholder="Número"
                      value={currentAddress.number || ""}
                      onChange={handleInputChange}
                      className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="complement" className="text-gray-700">Complemento (opcional)</Label>
                    <Input
                      id="complement"
                      name="complement"
                      placeholder="Apto, bloco, etc."
                      value={currentAddress.complement || ""}
                      onChange={handleInputChange}
                      className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood" className="text-gray-700">Bairro</Label>
                    <Input
                      id="neighborhood"
                      name="neighborhood"
                      placeholder="Bairro"
                      value={currentAddress.neighborhood || ""}
                      onChange={handleInputChange}
                      className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-700">Cidade</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="Cidade"
                      value={currentAddress.city || ""}
                      onChange={handleInputChange}
                      className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-gray-700">Estado</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="UF"
                      value={currentAddress.state || ""}
                      onChange={handleInputChange}
                      className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="space-y-2 flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      name="isDefault"
                      checked={currentAddress.isDefault || false}
                      onChange={(e) => setCurrentAddress(prev => ({ ...prev, isDefault: e.target.checked }))}
                      className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="isDefault" className="ml-2 text-gray-700">Tornar padrão</Label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  className="rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold"
                  onClick={handleSaveAddress}
                >
                  {editingId ? "Atualizar" : "Salvar"} Endereço
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AddressManager;