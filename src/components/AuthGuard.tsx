import React, { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@supabase/supabase-js";
import { UserRole } from "@/types/auth";

// Helper function to determine available roles based on user metadata
const getAvailableRoles = (user: User): UserRole[] => {
    const roles: UserRole[] = ['CONSUMER'];

    if (user.user_metadata?.role === 'ADMIN') {
        roles.push('ADMIN');
    }
    // Assuming Merchant status is set during merchant registration
    if (user.user_metadata?.status) {
        roles.push('MERCHANT');
    }
    // Assuming CPF is set during driver registration
    if (user.user_metadata?.cpf) {
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
        // If not logged in, redirect to login
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
      
      // 1. Handle Role Selection Requirement
      if (!activeRole || !availableRoles.includes(activeRole)) {
        if (path !== "/select-role") {
            // If multiple roles are available, force selection
            if (availableRoles.length > 1) {
                navigate("/select-role");
            } else {
                // If only one role, set it as active and redirect
                localStorage.setItem('active_role', availableRoles[0]);
                const targetPath = getRolePath(availableRoles[0], user);
                navigate(targetPath);
            }
        }
        setLoading(false);
        return;
      }
      
      // 2. Enforce Role Path and Merchant Status
      const expectedPrefix = getRolePrefix(activeRole);
      const isMerchantSetupRequired = activeRole === 'MERCHANT' && user.user_metadata?.status === 'PENDING';
      
      if (isMerchantSetupRequired && path !== "/merchant/setup") {
          navigate("/merchant/setup");
          setLoading(false);
          return;
      }
      
      if (!path.startsWith(expectedPrefix) && path !== "/select-role" && path !== "/checkout" && path !== "/chat") {
          // If trying to access a path outside the active role's domain, redirect to the role's dashboard
          const targetPath = getRolePath(activeRole, user);
          navigate(targetPath);
          setLoading(false);
          return;
      }
      
      // 3. Handle root path redirection
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
        // On sign in, force role selection check
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
      case 'MERCHANT': return user.user_metadata?.status === 'PENDING' ? '/merchant/setup' : '/merchant/dashboard';
      case 'DRIVER': return '/driver/orders';
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