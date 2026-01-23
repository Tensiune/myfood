"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Settings, Bike, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import RoleSwitcher from "@/components/shared/RoleSwitcher";

const DriverProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

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

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-4xl font-bold text-indigo-800 text-center">Meu Perfil Entregador</h1>

      <Card className="rounded-xl shadow-lg border border-gray-200 bg-white">
        <CardContent className="p-6 flex flex-col items-center space-y-4">
          <Avatar className="h-24 w-24 border-4 border-indigo-200">
            <AvatarImage src={user?.user_metadata?.avatar_url || "https://github.com/shadcn.png"} />
            <AvatarFallback className="text-indigo-600 text-2xl font-bold">
              {user?.email ? user.email.charAt(0).toUpperCase() : <User className="h-12 w-12" />}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-semibold text-gray-800">{user?.user_metadata?.full_name || user?.email || "Entregador"}</h2>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <Bike className="h-4 w-4" />
            <span>Entregador Parceiro</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Role Switcher Section */}
      <RoleSwitcher variant="button" className="w-full" />

      <section className="space-y-4">
        <Card className="rounded-xl shadow-sm border border-gray-200 bg-white">
          <CardContent className="p-4 space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start p-2 rounded-lg hover:bg-gray-50 transition-colors h-auto"
              onClick={() => navigate("/driver/setup")}
            >
              <Settings className="h-5 w-5 mr-3 text-indigo-600" />
              <span className="text-gray-700 font-medium">Configurações e Documentos</span>
              <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
            </Button>
          </CardContent>
        </Card>

        <Button onClick={handleLogout} className="w-full rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold py-2">
          <LogOut className="h-5 w-5 mr-2" /> Sair
        </Button>
      </section>
    </div>
  );
};

export default DriverProfilePage;