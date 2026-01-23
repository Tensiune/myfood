"use client";

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { Bike } from "lucide-react";

const DriverRegisterPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showError("As senhas não coincidem.");
      return;
    }
    
    if (password.length < 6) {
      showError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            cpf: cpf,
            role: 'DRIVER',
            status: 'NEEDS_SETUP' // Garante que o entregador vá para o setup primeiro
          }
        }
      });
      
      if (error) throw error;
      
      showSuccess("Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.");
      navigate("/login");
    } catch (error: any) {
      showError(error.message || "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <Card className="w-full max-w-md rounded-xl shadow-lg border-none">
        <CardHeader className="text-center space-y-2">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Bike className="h-8 w-8 text-indigo-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-indigo-800">Cadastro de Entregador</CardTitle>
          <CardDescription className="text-gray-600">
            Preencha os dados abaixo para criar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-gray-700">Nome Completo</Label>
              <Input
                id="fullName"
                placeholder="Seu nome completo"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cpf" className="text-gray-700">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                required
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-gray-700">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="********"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
              />
            </div>
            
            <Button
              type="submit"
              className="w-full rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-2"
              disabled={loading}
            >
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </form>
          
          <div className="text-center text-sm text-gray-600">
            Já tem uma conta?{" "}
            <Link to="/login" className="underline text-indigo-600 hover:text-indigo-800">
              Entrar
            </Link>
            <p className="mt-2">
              <Link to="/register" className="text-xs text-gray-500 hover:underline">
                Voltar para seleção de perfil
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverRegisterPage;