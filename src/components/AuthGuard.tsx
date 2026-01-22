import React, { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { showLoading, dismissToast } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";

const AuthGuard = () => {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        setLoading(false);
        return;
      }

      const role = session.user.user_metadata?.role || "CONSUMER";
      setUserRole(role);
      setLoading(false);

      // Redirecionamento automático baseado no Role
      // Se o usuário está na raiz ou em rotas que não pertencem ao seu Role, redireciona para sua Home específica
      const path = location.pathname;

      if (path === "/" || path === "/login" || path === "/register") {
        if (role === "MERCHANT") navigate("/merchant/dashboard");
        else if (role === "ADMIN") navigate("/admin/dashboard");
        else if (role === "DRIVER") navigate("/driver/orders");
      } else {
        // Proteção extra: impede que lojista acesse rotas de consumidor e vice-versa
        if (role === "MERCHANT" && !path.startsWith("/merchant") && !path.startsWith("/chat")) {
          navigate("/merchant/dashboard");
        } else if (role === "CONSUMER" && (path.startsWith("/merchant") || path.startsWith("/admin") || path.startsWith("/driver"))) {
          navigate("/");
        }
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/login");
      } else if (event === "SIGNED_IN" && session) {
        const role = session.user.user_metadata?.role || "CONSUMER";
        if (role === "MERCHANT") navigate("/merchant/dashboard");
        else if (role === "DRIVER") navigate("/driver/orders");
        else navigate("/");
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
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default AuthGuard;