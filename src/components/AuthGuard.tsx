import React, { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { showLoading, dismissToast } from "@/utils/toast";

const AuthGuard = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const loadingToastId = showLoading("Verificando autenticação...");
      const { data: { session } } = await supabase.auth.getSession();

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return <Outlet />;
};

export default AuthGuard;