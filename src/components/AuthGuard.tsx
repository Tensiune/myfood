import React, { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@supabase/supabase-js";
import { UserRole } from "@/types/auth";

// Helper function to determine available roles based on user metadata
const getAvailableRoles = (user: User): UserRole[] => {
    const roles: UserRole[] = ['CONSUMER'];
    const metadataRole = user.user_metadata?.role;

    if (metadataRole === 'ADMIN') roles.push('ADMIN');
    if (metadataRole === 'MERCHANT') roles.push('MERCHANT');
    if (metadataRole === 'DRIVER') roles.push('DRIVER');
    
    return Array.from(new Set(roles));
};

const AuthGuard = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (!location.pathname.startsWith("/login") && !location.pathname.includes("-register") && location.pathname !== "/forgot-password" && location.pathname !== "/reset-password") {
            navigate("/login");
        }
        setLoading(false);
        return;
      }

      const user = session.user;
      const availableRoles = getAvailableRoles(user);
      const activeRoleFromStorage = localStorage.getItem('active_role') as UserRole | null;
      const path = location.pathname;
      
      // Inteligência de seleção de papel inicial
      let activeRole = activeRoleFromStorage;
      
      if (!activeRole || !availableRoles.includes(activeRole)) {
          const professionalRoles = availableRoles.filter(r => r !== 'CONSUMER');
          if (professionalRoles.length === 1) {
              // Se tiver apenas um papel profissional, assume ele automaticamente
              activeRole = professionalRoles[0];
              localStorage.setItem('active_role', activeRole);
          } else if (professionalRoles.length > 1) {
              // Se tiver múltiplos, obriga a escolha
              if (path !== "/select-role") {
                  navigate("/select-role");
                  setLoading(false);
                  return;
              }
          } else {
              // Apenas consumidor
              activeRole = 'CONSUMER';
              localStorage.setItem('active_role', 'CONSUMER');
          }
      }
      
      const expectedPrefix = getRolePrefix(activeRole!);
      
      // Validação de Status (Setup Obrigatório)
      const status = user.user_metadata?.status;
      const isMerchantSetupRequired = activeRole === 'MERCHANT' && status === 'NEEDS_SETUP';
      const isDriverSetupRequired = activeRole === 'DRIVER' && status === 'NEEDS_SETUP';
      
      if (isMerchantSetupRequired && path !== "/merchant/setup") {
          navigate("/merchant/setup");
          setLoading(false);
          return;
      }

      if (isDriverSetupRequired && path !== "/driver/setup") {
          navigate("/driver/setup");
          setLoading(false);
          return;
      }
      
      // EXCEÇÕES: Rotas compartilhadas
      const isSharedRoute = 
        path === "/select-role" || 
        path === "/checkout" || 
        path.startsWith("/chat") || 
        path.startsWith("/track");

      // Redirecionamento para o prefixo correto baseado no papel ATIVO
      if (!path.startsWith(expectedPrefix) && !isSharedRoute && expectedPrefix !== '/') {
          const targetPath = getRolePath(activeRole!, user);
          navigate(targetPath);
          setLoading(false);
          return;
      }
      
      // Se estiver na raiz e for profissional, manda pro dashboard dele
      if (path === "/" && activeRole !== 'CONSUMER') {
          const targetPath = getRolePath(activeRole!, user);
          navigate(targetPath);
          setLoading(false);
          return;
      }
      
      setLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        localStorage.removeItem('active_role');
        navigate("/login");
      } else if (event === "SIGNED_IN" && session) {
        checkUser();
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const getRolePrefix = (role: UserRole) => {
    switch (role) {
      case 'MERCHANT': return '/merchant';
      case 'DRIVER': return '/driver';
      case 'ADMIN': return '/admin';
      case 'CONSUMER': return '/';
      default: return '/';
    }
  };
  
  const getRolePath = (role: UserRole, user: User) => {
    const status = user.user_metadata?.status;
    switch (role) {
      case 'CONSUMER': return '/';
      case 'MERCHANT': return status === 'NEEDS_SETUP' ? '/merchant/setup' : '/merchant/dashboard';
      case 'DRIVER': return status === 'NEEDS_SETUP' ? '/driver/setup' : '/driver/orders';
      case 'ADMIN': return '/admin/dashboard';
      default: return '/';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 space-y-4">
        <Skeleton className="h-12 w-3/4 rounded-lg" />
        <Skeleton className="h-8 w-1/2 rounded-lg" />
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default AuthGuard;