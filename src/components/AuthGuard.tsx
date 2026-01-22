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
      const status = session.user.user_metadata?.status; // Get merchant status
      setUserRole(role);
      setLoading(false);

      const path = location.pathname;
      
      // --- Merchant Specific Logic ---
      if (role === "MERCHANT") {
        // If PENDING, force redirect to setup page unless already there
        if (status === "PENDING" && path !== "/merchant/setup") {
          navigate("/merchant/setup");
          return;
        }
        // If APPROVED, prevent access to setup page
        if (status === "APPROVED" && path === "/merchant/setup") {
          navigate("/merchant/dashboard");
          return;
        }
      }
      // -------------------------------

      // General redirection logic for root/login/register pages
      if (path === "/" || path === "/login" || path === "/register" || path === "/merchant-register") {
        if (role === "MERCHANT") {
          // If merchant is approved, go to dashboard, otherwise setup (handled above)
          if (status === "APPROVED") navigate("/merchant/dashboard");
          else if (status === "PENDING") navigate("/merchant/setup");
        }
        else if (role === "ADMIN") navigate("/admin/dashboard");
        else if (role === "DRIVER") navigate("/driver/orders");
      } else {
        // Protection extra: prevents cross-role access
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
        const status = session.user.user_metadata?.status;
        
        if (role === "MERCHANT") {
          if (status === "PENDING") navigate("/merchant/setup");
          else navigate("/merchant/dashboard");
        }
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