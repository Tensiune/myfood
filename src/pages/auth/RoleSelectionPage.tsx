"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Store, Bike, ShieldCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/types/auth";
import { showSuccess } from "@/utils/toast";

const RoleSelectionPage = () => {
  const navigate = useNavigate();
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);
      
      const roles: UserRole[] = ['CONSUMER'];

      if (user.user_metadata?.role === 'ADMIN') {
        roles.push('ADMIN');
      }
      // Merchant status is set during merchant registration
      if (user.user_metadata?.status) {
        roles.push('MERCHANT');
      }
      // CPF is set during driver registration
      if (user.user_metadata?.cpf) {
        roles.push('DRIVER');
      }
      
      const uniqueRoles = Array.from(new Set(roles));
      setAvailableRoles(uniqueRoles);
      setLoading(false);

      // If only one role is available, redirect immediately
      if (uniqueRoles.length === 1) {
        handleRoleSelect(uniqueRoles[0]);
      }
    };
    fetchUserAndRoles();
  }, [navigate]);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'CONSUMER': return User;
      case 'MERCHANT': return Store;
      case 'DRIVER': return Bike;
      case 'ADMIN': return ShieldCheck;
      default: return User;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'CONSUMER': return 'App Consumidor';
      case 'MERCHANT': return 'Painel Lojista';
      case 'DRIVER': return 'App Entregador';
      case 'ADMIN': return 'Painel Administrador';
      default: return 'Selecionar Perfil';
    }
  };

  const getRolePath = (role: UserRole) => {
    switch (role) {
      case 'CONSUMER': return '/';
      case 'MERCHANT': return user?.user_metadata?.status === 'PENDING' ? '/merchant/setup' : '/merchant/dashboard';
      case 'DRIVER': return '/driver/orders';
      case 'ADMIN': return '/admin/dashboard';
      default: return '/';
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    // Store the selected role in local storage
    localStorage.setItem('active_role', role);
    showSuccess(`Acessando como ${getRoleLabel(role)}.`);
    navigate(getRolePath(role));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-indigo-600 font-bold">Carregando perfis...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <Card className="w-full max-w-md rounded-xl shadow-lg border-none">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold text-indigo-800">Selecione seu Perfil</CardTitle>
          <CardDescription className="text-gray-600">
            Você tem acesso a múltiplos painéis. Escolha como deseja continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableRoles.map((role) => {
            const Icon = getRoleIcon(role);
            const label = getRoleLabel(role);
            
            // Check if Merchant is pending approval
            const isMerchantPending = role === 'MERCHANT' && user?.user_metadata?.status === 'PENDING';

            return (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className="w-full"
                disabled={isMerchantPending}
              >
                <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  role === 'MERCHANT' ? 'bg-brand-accent/10 border-brand-accent/50 hover:bg-brand-accent/20' :
                  role === 'DRIVER' ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' :
                  role === 'ADMIN' ? 'bg-red-50 border-red-200 hover:bg-red-100' :
                  'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                } ${isMerchantPending ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <div className="flex items-center gap-4">
                    <Icon className={`h-6 w-6 ${
                      role === 'MERCHANT' ? 'text-brand-accent' :
                      role === 'DRIVER' ? 'text-blue-600' :
                      role === 'ADMIN' ? 'text-red-600' :
                      'text-indigo-600'
                    }`} />
                    <div className="text-left">
                        <span className="font-bold text-gray-800 block">{label}</span>
                        {isMerchantPending && (
                            <span className="text-xs text-red-500 font-medium">Aguardando Aprovação</span>
                        )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-500" />
                </div>
              </button>
            );
          })}
          
          <Button 
            variant="ghost" 
            className="w-full text-gray-500 hover:text-red-500 mt-4"
            onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
          >
            Sair da Conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleSelectionPage;