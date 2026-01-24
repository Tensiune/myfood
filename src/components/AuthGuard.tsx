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

    if (metadataRole === 'ADMIN') {
        roles.push('ADMIN');
    }
    
    if (metadataRole === 'MERCHANT') {
        roles.push('MERCHANT');
    }
    
    if (metadataRole === 'DRIVER') {
        roles.push('DRIVER');
    }
    
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
        if (!location.pathname.startsWith("/login") && !location.pathname.includes("-register") && location.pathname !== "/forgot-password") {
            navigate("/login");
        }
        setLoading(false);
        return;
      }

      const user = session.user;
      const availableRoles = getAvailableRoles(user);
      const activeRole = localStorage.getItem('active_role') as UserRole | null;
      const path = location.pathname;
      
      // If no active role is set or it's invalid for this user
      if (!activeRole || !availableRoles.includes(activeRole)) {
        if (path !== "/select-role") {
            // Intelligent redirect: if user has a professional role, prioritize it
            const professionalRoles = availableRoles.filter(r => r !== 'CONSUMER');
            
            if (professionalRoles.length === 1) {
                // Auto-select the only professional role available
                const chosenRole = professionalRoles[0];
                localStorage.setItem('active_role', chosenRole);
                const targetPath = getRolePath(chosenRole, user);
                navigate(targetPath);
            } else if (availableRoles.length > 1) {
                // Multiple roles (e.g. Admin + Merchant), let them choose
                navigate("/select-role");
            } else {
                // Only consumer
                localStorage.setItem('active_role', 'CONSUMER');
                navigate("/");
            }
        }
        setLoading(false);
        return;
      }
      
      const expectedPrefix = getRolePrefix(activeRole);
      
      // Enforce setup pages for both roles based on user metadata status
      const isMerchantSetupRequired = activeRole === 'MERCHANT' && user.user_metadata?.status === 'NEEDS_SETUP';
      const isDriverSetupRequired = activeRole === 'DRIVER' && user.user_metadata?.status === 'NEEDS_SETUP';
      
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
      
      // EXCEÇÕES: Rotas compartilhadas que não precisam do prefixo do papel
      const isSharedRoute = 
        path === "/select-role" || 
        path === "/checkout" || 
        path.startsWith("/chat") || 
        path.startsWith("/track");

      // Redirect if user is trying to access a prefix that doesn't match their active role
      if (!path.startsWith(expectedPrefix) && !isSharedRoute) {
          const targetPath = getRolePath(activeRole, user);
          navigate(targetPath);
          setLoading(false);
          return;
      }
      
      // Handle root path redirect
      if (path === "/") {
          const targetPath = getRolePath(activeRole, user);
          if (targetPath !== "/") {
              navigate(targetPath);
              setLoading(false);
              return;
          }
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

    return () => {
      authListener.subscription.unsubscribe();
    };
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
    switch (role) {
      case 'CONSUMER': return '/';
      case 'MERCHANT': return user.user_metadata?.status === 'NEEDS_SETUP' ? '/merchant/setup' : '/merchant/dashboard';
      case 'DRIVER': return user.user_metadata?.status === 'NEEDS_SETUP' ? '/driver/setup' : '/driver/orders';
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
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default AuthGuard;