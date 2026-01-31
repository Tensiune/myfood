"use client";

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@supabase/supabase-js";
import { UserRole } from "@/types/auth";

const getAvailableRoles = (user: User): UserRole[] => {
    const roles: UserRole[] = ['CONSUMER'];
    const metadataRole = user.user_metadata?.role;

    if (metadataRole === 'ADMIN') roles.push('ADMIN');
    if (metadataRole === 'MERCHANT') roles.push('MERCHANT');
    if (metadataRole === 'DRIVER') roles.push('DRIVER');
    
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isCheckingRef = useRef(false);

  useEffect(() => {
    const checkUser = async () => {
      // Prevent multiple concurrent checks which cause the AbortController error
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
          const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path)) || location.pathname.includes("-register");
          
          if (!isPublicPath) {
            navigate("/login");
          }
          setLoading(false);
          isCheckingRef.current = false;
          return;
        }

        const user = session.user;
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
                    setLoading(false);
                    isCheckingRef.current = false;
                    return;
                }
            } else {
                activeRole = 'CONSUMER';
                localStorage.setItem('active_role', 'CONSUMER');
            }
        }
        
        const expectedPrefix = getRolePrefix(activeRole!);
        const status = user.user_metadata?.status;
        
        // Setup validation
        if (activeRole === 'MERCHANT' && status === 'NEEDS_SETUP' && path !== "/merchant/setup") {
            navigate("/merchant/setup");
            setLoading(false);
            isCheckingRef.current = false;
            return;
        }

        if (activeRole === 'DRIVER' && status === 'NEEDS_SETUP' && path !== "/driver/setup") {
            navigate("/driver/setup");
            setLoading(false);
            isCheckingRef.current = false;
            return;
        }
        
        const isSharedRoute = 
          path === "/select-role" || 
          path === "/checkout" || 
          path.startsWith("/chat") || 
          path.startsWith("/track");

        if (!path.startsWith(expectedPrefix) && !isSharedRoute && expectedPrefix !== '/') {
            navigate(getRolePath(activeRole!, user));
            setLoading(false);
            isCheckingRef.current = false;
            return;
        }
        
        if (path === "/" && activeRole !== 'CONSUMER') {
            navigate(getRolePath(activeRole!, user));
            setLoading(false);
            isCheckingRef.current = false;
            return;
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        localStorage.removeItem('active_role');
        navigate("/login");
      } else if (event === "SIGNED_IN") {
        checkUser();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

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