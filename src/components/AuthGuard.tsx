"use client";

import React, { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@supabase/supabase-js";
import { UserRole } from "@/types/auth";
import { useAuth } from "@/context/AuthContext";

const getAvailableRoles = (user: User): UserRole[] => {
    const roles: UserRole[] = ['CONSUMER'];
    
    // Verifica primeiro o app_metadata (Seguro/Admin)
    const appRole = user.app_metadata?.role;
    // Verifica o user_metadata (Cadastro inicial)
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

const AuthGuard = () => {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading) return;

    if (!session || !user) {
      const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
      const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path)) || location.pathname.includes("-register");
      
      if (!isPublicPath) {
        navigate("/login");
      }
      return;
    }

    const availableRoles = getAvailableRoles(user);
    const activeRoleFromStorage = localStorage.getItem('active_role') as UserRole | null;
    const path = location.pathname;
    
    let activeRole = activeRoleFromStorage;
    
    if (!activeRole || !availableRoles.includes(activeRole)) {
        const professionalRoles = availableRoles.filter(r => r !== 'CONSUMER');
        if (professionalRoles.length === 1) {
            activeRole = professionalRoles[0];
            localStorage.setItem('active_role', activeRole);
        } else if (professionalRoles.length > 1) {
            if (path !== "/select-role") {
                navigate("/select-role");
                return;
            }
        } else {
            activeRole = 'CONSUMER';
            localStorage.setItem('active_role', 'CONSUMER');
        }
    }
    
    const expectedPrefix = getRolePrefix(activeRole!);
    const status = user.user_metadata?.status;
    
    if (activeRole === 'MERCHANT' && status === 'NEEDS_SETUP' && path !== "/merchant/setup") {
        navigate("/merchant/setup");
        return;
    }

    if (activeRole === 'DRIVER' && status === 'NEEDS_SETUP' && path !== "/driver/setup") {
        navigate("/driver/setup");
        return;
    }
    
    const isSharedRoute = 
      path === "/select-role" || 
      path === "/checkout" || 
      path.startsWith("/chat") || 
      path.startsWith("/track");

    if (!path.startsWith(expectedPrefix) && !isSharedRoute && expectedPrefix !== '/') {
        navigate(getRolePath(activeRole!, user));
        return;
    }
    
    if (path === "/" && activeRole !== 'CONSUMER') {
        navigate(getRolePath(activeRole!, user));
        return;
    }
  }, [session, user, authLoading, location.pathname, navigate]);

  if (authLoading) {
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