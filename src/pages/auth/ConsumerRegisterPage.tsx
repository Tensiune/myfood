"use client";

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { User } from "lucide-react";

const ConsumerRegisterPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showError("As senhas não coincidem.");
      return;
    }
    
    if (phone.length < 8) {
      showError("Informe um telefone válido.");
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
            phone: phone,
            role: 'CONSUMER'
          }
        }
      });
      
      if (error) throw error;
      
      localStorage.removeItem('active_role');
      showSuccess("Cadastro realizado! Verifique seu e-mail.");
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
            <User className="h-8 w-8 text-indigo-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-indigo-800">Cadastro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input placeholder="Seu nome" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-lg" />
            </div>
            
            <div className="space-y-2">
              <Label>Telefone (com DDD)</Label>
              <Input placeholder="(00) 00000-0000" required value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg" />
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="seu@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg" />
            </div>
            
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" placeholder="********" required value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg" />
            </div>
            
            <div className="space-y-2">
              <Label>Confirmar Senha</Label>
              <Input type="password" placeholder="********" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-lg" />
            </div>
            
            <Button type="submit" className="w-full rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-2" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </form>
          <div className="text-center text-sm text-gray-600">
            Já tem uma conta? <Link to="/login" className="underline text-indigo-600">Entrar</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsumerRegisterPage;