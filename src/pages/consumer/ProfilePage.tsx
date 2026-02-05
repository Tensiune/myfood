"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Share2, Star, Mail, Settings, LogOut, MapPin, ArrowRight, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import AddressManager from "@/components/consumer/AddressManager";
import RoleSwitcher from "@/components/shared/RoleSwitcher";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // Se não houver usuário, o AuthGuard deveria ter redirecionado, mas por segurança:
            navigate("/login");
            return;
        }
        setUser(user);
      } catch (e: any) {
        console.error("Error fetching user in ProfilePage:", e);
        setError("Erro ao carregar dados do usuário.");
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showSuccess("Deslogado com sucesso!");
      navigate("/login");
    } catch (error: any) {
      showError(error.message || "Erro ao deslogar.");
    }
  };
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-xl shadow-lg border-none p-6 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-red-800">Erro de Carregamento</h1>
          <p className="text-gray-600">{error}</p>
          <Button onClick={() => navigate("/")} className="rounded-xl bg-indigo-600">Voltar</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-4xl font-bold text-indigo-800 text-center">Meu Perfil</h1>

      <Card className="rounded-xl shadow-lg border border-gray-200 bg-white">
        <CardContent className="p-6 flex flex-col items-center space-y-4">
          <Avatar className="h-24 w-24 border-4 border-indigo-200">
            <AvatarImage src={user?.user_metadata?.avatar_url || "https://github.com/shadcn.png"} />
            <AvatarFallback className="text-indigo-600 text-2xl font-bold">
              {user?.email ? user.email.charAt(0).toUpperCase() : <User className="h-12 w-12" />}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-semibold text-gray-800">{user?.email || "Usuário"}</h2>
          <Button variant="outline" className="rounded-full border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            Editar Perfil
          </Button>
        </CardContent>
      </Card>
      
      {/* Role Switcher Section */}
      <RoleSwitcher variant="button" className="w-full" />

      {/* Gerenciamento de Endereços */}
      <section className="space-y-4">
        <Card className="rounded-xl shadow-sm border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-indigo-800 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-indigo-600" />
              Endereços de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <AddressManager />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <Card className="rounded-xl shadow-sm border border-gray-200 bg-white">
          <CardContent className="p-4 space-y-2">
            <Link to="/invite-friends" className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Share2 className="h-5 w-5 mr-3 text-indigo-600" />
              <span className="text-gray-700 font-medium">Indicar o app para amigos</span>
              <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
            </Link>
            <Link to="/share-app" className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Share2 className="h-5 w-5 mr-3 text-indigo-600" />
              <span className="text-gray-700 font-medium">Compartilhar o app nas redes sociais</span>
              <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
            </Link>
            <Link to="/rate-app" className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Star className="h-5 w-5 mr-3 text-indigo-600" />
              <span className="text-gray-700 font-medium">Avaliar o app</span>
              <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
            </Link>
            <Link to="/inbox" className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Mail className="h-5 w-5 mr-3 text-indigo-600" />
              <span className="text-gray-700 font-medium">Caixa de entrada</span>
              <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border border-gray-200 bg-white">
          <CardContent className="p-4 space-y-2">
            <Link to="/settings" className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="h-5 w-5 mr-3 text-indigo-600" />
              <span className="text-gray-700 font-medium">Configurações de privacidade</span>
              <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
            </Link>
            <Link to="/terms" className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-gray-700 font-medium ml-8">Termos de uso</span>
              <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
            </Link>
            <Link to="/privacy-policy" className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-gray-700 font-medium ml-8">Política de privacidade</span>
              <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
            </Link>
          </CardContent>
        </Card>

        <Button onClick={handleLogout} className="w-full rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold py-2">
          <LogOut className="h-5 w-5 mr-2" /> Sair
        </Button>
      </section>
    </div>
  );
};

export default ProfilePage;