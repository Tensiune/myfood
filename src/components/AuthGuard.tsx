"use client";

import React, { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@supabase/supabase-js";
import { UserRole } from "@/types/auth";
import { useAuth } from "@/context/AuthContext";

const getAvailableRoles = (user: User): UserRole[] => {
    const roles: UserRole[] = ['CONSUMER'];
    const appRole = user.app_metadata?.role;
    const metaRole = user.user_metadata?.role;

    if (appRole === 'ADMIN' || metaRole === 'ADMIN') roles.push('ADMIN');
    if (appRole === 'MERCHANT' || metaRole === 'MERCHANT') roles.push('MERCHANT');
    if (appRole === 'DRIVER' || metaRole === 'DRIVER') roles.push('DRIVER');
    
    return Array.from(new Set(roles));
};

const getRolePrefix = (role: UserRole) => {
    switch (role) {
      case 'MERCHANT': return '/merchant';
      case 'DRIVER': return '/driver';
      case 'ADMIN': return '/admin';
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

const AuthGuard = () => {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading) return;

    const path = location.pathname;

    if (!session || !user) {
      const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
      const isPublicPath = publicPaths.some(p => path.startsWith(p)) || path.includes("-register");
      
      if (!isPublicPath) {
        navigate("/login");
      }
      return;
    }

    const availableRoles = getAvailableRoles(user);
    const activeRole = (localStorage.getItem('active_role') as UserRole) || 'CONSUMER';
    
    // Se o papel ativo não for permitido para este usuário, redefine para o primeiro disponível
    if (!availableRoles.includes(activeRole)) {
        localStorage.setItem('active_role', availableRoles[0]);
        navigate(getRolePath(availableRoles[0], user));
        return;
    }

    const status = user.user_metadata?.status;
    
    // Bloqueia acesso se estiver em setup
    if (activeRole === 'MERCHANT' && status === 'NEEDS_SETUP' && path !== "/merchant/setup") {
        navigate("/merchant/setup");
        return;
    }
    if (activeRole === 'DRIVER' && status === 'NEEDS_SETUP' && path !== "/driver/setup") {
        navigate("/driver/setup");
        return;
    }

    // Rotas compartilhadas por todos os perfis logados
    const isSharedRoute = 
      path === "/select-role" || 
      path === "/checkout" || 
      path.startsWith("/chat") || 
      path.startsWith("/track") ||
      path.startsWith("/profile") || 
      path.startsWith("/inbox");

    if (isSharedRoute) return;

    const expectedPrefix = getRolePrefix(activeRole);
    
    // Regra de prefixo: Se estou num prefixo errado para meu papel ativo, redireciona
    if (expectedPrefix !== '/' && !path.startsWith(expectedPrefix)) {
        navigate(getRolePath(activeRole, user));
    }
    
    // Se estou na home mas meu papel não é consumidor, vai para o dashboard do papel
    if (path === "/" && activeRole !== 'CONSUMER') {
        navigate(getRolePath(activeRole, user));
    }

  }, [session, user, authLoading, location.pathname, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
        <Skeleton className="h-12 w-3/4 rounded-lg" />
        <Skeleton className="h-8 w-1/2 rounded-lg" />
      </div>
    );
  }

  return <Outlet />;
};

export default AuthGuard;