import React, { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { showLoading, dismissToast } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton component

const AuthGuard = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const loadingToastId = showLoading("Verificando autenticação...");
      const { data: { session } = {} } = await supabase.auth.getSession(); // Destructure with default empty object

      if (!session) {
        navigate("/login");
      }
      setLoading(false);
      dismissToast(loadingToastId);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

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
        <Skeleton className="h-16 w-full max-w-md rounded-xl" />
      </div>
    );
  }

  return <Outlet />;
};

export default AuthGuard;