"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { Lock, CheckCircle2 } from "lucide-react";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase handles the token exchange automatically when the user lands on this page.
    // We check for a session to ensure the user is authorized to update the password.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session, the user might have landed here without clicking the link, or the link expired.
        // We let them try to set the password, which will fail if the session isn't active.
      }
    };
    checkSession();
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      showError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      showError("As senhas não coincidem.");
      return;
    }
    
    setLoading(true);
    try {
      // supabase.auth.updateUser works if the user is currently logged in via the recovery token session
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setIsSuccess(true);
      showSuccess("Senha redefinida com sucesso! Faça login com sua nova senha.");
      
      // Automatically sign out the temporary recovery session
      await supabase.auth.signOut();
      
      setTimeout(() => navigate("/login"), 3000);
      
    } catch (error: any) {
      showError(error.message || "Erro ao redefinir a senha. O link pode ter expirado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <Card className="w-full max-w-md rounded-xl shadow-lg border-none">
        <CardHeader className="text-center space-y-2">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8 text-indigo-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-indigo-800">Redefinir Senha</CardTitle>
          <CardDescription className="text-gray-600">
            Insira sua nova senha abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSuccess ? (
            <div className="text-center space-y-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-lg font-semibold text-gray-700">Senha alterada!</p>
              <p className="text-sm text-gray-500">Você será redirecionado para o login em breve.</p>
            </div>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Nova Senha</Label>
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
                <Label htmlFor="confirm-password" className="text-gray-700">Confirmar Nova Senha</Label>
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
              <Button type="submit" className="w-full rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-2" disabled={loading}>
                {loading ? "Redefinindo..." : "Redefinir Senha"}
              </Button>
            </form>
          )}
          <div className="text-center text-sm text-gray-600">
            <Button variant="link" onClick={() => navigate("/login")} className="text-indigo-600 hover:text-indigo-800">
              Voltar para o Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;