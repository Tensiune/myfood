"use client";

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { Store, Building2, User, Mail, Lock } from "lucide-react";

const MerchantRegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    storeName: "",
    cuisineType: "",
    cnpj: "",
    phone: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      showError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'MERCHANT',
            store_name: formData.storeName,
            status: 'PENDING'
          }
        }
      });

      if (error) throw error;

      // Aqui simulamos o registro dos detalhes da loja em uma tabela 'merchants'
      // O Supabase faria isso via Triggers ou você faria aqui.
      
      showSuccess("Cadastro realizado! Aguarde a análise do administrador para ativar sua loja.");
      navigate("/login");
    } catch (error: any) {
      showError(error.message || "Erro ao cadastrar lojista.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 py-12">
      <div className="flex items-center gap-2 mb-8 text-indigo-900">
        <Store className="h-10 w-10 text-brand-accent" />
        <h1 className="text-3xl font-black tracking-tight">Seja um Parceiro</h1>
      </div>

      <Card className="w-full max-w-2xl rounded-3xl shadow-xl border-none overflow-hidden">
        <div className="bg-indigo-900 p-8 text-white text-center">
          <CardTitle className="text-2xl font-bold">Venda mais com o FoodApp</CardTitle>
          <p className="text-indigo-200 mt-2">Crie sua conta de lojista agora mesmo.</p>
        </div>
        
        <CardContent className="p-8">
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informações da Loja */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-brand-accent" /> Sobre a Loja
                </h3>
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input name="storeName" placeholder="Ex: Pizzaria do Zé" required onChange={handleInputChange} className="rounded-xl border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Cozinha</Label>
                  <Select onValueChange={(v) => setFormData({...formData, cuisineType: v})}>
                    <SelectTrigger className="rounded-xl border-gray-200">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brasileira">Brasileira</SelectItem>
                      <SelectItem value="pizza">Pizza</SelectItem>
                      <SelectItem value="japonesa">Japonesa</SelectItem>
                      <SelectItem value="hamburguer">Hambúrguer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input name="cnpj" placeholder="00.000.000/0000-00" required onChange={handleInputChange} className="rounded-xl border-gray-200" />
                </div>
              </div>

              {/* Informações de Acesso */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-brand-accent" /> Conta de Acesso
                </h3>
                <div className="space-y-2">
                  <Label>Email Profissional</Label>
                  <Input name="email" type="email" placeholder="loja@email.com" required onChange={handleInputChange} className="rounded-xl border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input name="password" type="password" placeholder="********" required onChange={handleInputChange} className="rounded-xl border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Senha</Label>
                  <Input name="confirmPassword" type="password" placeholder="********" required onChange={handleInputChange} className="rounded-xl border-gray-200" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-7 text-lg shadow-lg shadow-brand-accent/20" disabled={loading}>
              {loading ? "Processando..." : "Cadastrar Minha Loja"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-sm">
              Já tem uma conta de parceiro?{" "}
              <Link to="/login" className="font-bold text-indigo-600 hover:underline">Entrar agora</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantRegisterPage;