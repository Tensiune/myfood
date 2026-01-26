import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { Facebook, Chrome } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Limpa o papel ativo para forçar o AuthGuard a ler os metadados do novo usuário
      localStorage.removeItem('active_role');
      
      showSuccess("Login realizado com sucesso!");
      // Navigate to root, where AuthGuard will take over and decide 
      // where to send the user based on their role/status
      navigate("/");
    } catch (error: any) {
      showError(error.message || "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      showError(error.message || `Erro ao fazer login com ${provider}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <Card className="w-full max-w-md rounded-xl shadow-lg border-none">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold text-indigo-800">Bem-vindo de volta!</CardTitle>
          <CardDescription className="text-gray-600">Faça login para continuar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
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
            <Button type="submit" className="w-full rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-2" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Ou continue com</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="w-full rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => handleSocialLogin('google')} disabled={loading}>
              <Chrome className="mr-2 h-4 w-4" /> Google
            </Button>
            <Button variant="outline" className="w-full rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => handleSocialLogin('facebook')} disabled={loading}>
              <Facebook className="mr-2 h-4 w-4" /> Facebook
            </Button>
          </div>
          <div className="text-center text-sm text-gray-600 space-y-2">
            <Link to="/forgot-password" className="underline text-indigo-600 hover:text-indigo-800">
              Esqueceu sua senha?
            </Link>
            <p>
              Não tem uma conta?{" "}
              <Link to="/register" className="underline text-indigo-600 hover:text-indigo-800">
                Cadastre-se
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;