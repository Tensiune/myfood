import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Home, Search, ShoppingBag, User, Bell, MapPin, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

const ConsumerLayout = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentAddress, setCurrentAddress] = useState("Rua Exemplo, 123");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { getItemCount } = useCart();
  const cartItemCount = getItemCount();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session) {
        navigate("/login");
      }
    });

    // Placeholder for fetching notifications
    setNotificationCount(3);

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showSuccess("Deslogado com sucesso!");
      navigate("/login");
    } catch (error: any) {
      showError(error.message || "Erro ao deslogar.");
    }
  };

  const navItems = [
    { path: "/", icon: Home, label: "Início" },
    { path: "/search", icon: Search, label: "Buscar" },
    { path: "/orders", icon: ShoppingBag, label: "Pedidos" },
    { path: "/profile", icon: User, label: "Perfil" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between sticky top-0 z-10 rounded-b-xl border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-indigo-600" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-gray-700 font-medium hover:bg-gray-100 rounded-lg px-3 py-2">
                {currentAddress} <span className="ml-1 text-xs text-gray-500">▼</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-lg shadow-md">
              <DropdownMenuLabel>Endereço de Entrega</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert("Editar/Alterar Endereço")}>
                <MapPin className="mr-2 h-4 w-4" /> Editar/Alterar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-white shadow-sm">
              {notificationCount}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 p-2 fixed bottom-0 left-0 right-0 z-10 rounded-t-xl shadow-lg">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-all duration-200 transform hover:scale-105",
                  isActive ? "text-brand-accent bg-indigo-50" : "text-gray-600 hover:text-indigo-600"
                )}
              >
                {item.path === "/profile" && user ? (
                  <Avatar className={cn("h-7 w-7 transition-all duration-200", isActive ? "border-2 border-brand-accent ring-2 ring-brand-accent/50" : "")}>
                    <AvatarImage src={user?.user_metadata?.avatar_url || "https://github.com/shadcn.png"} />
                    <AvatarFallback className="text-xs">CN</AvatarFallback>
                  </Avatar>
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className="text-xs mt-1 font-medium">{item.label}</span>
                {item.path === "/orders" && cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-white shadow-sm">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default ConsumerLayout;