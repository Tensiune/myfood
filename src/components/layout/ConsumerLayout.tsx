import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { Home, Search, ShoppingBag, User, Bell, MapPin, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

const ConsumerLayout = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentAddress, setCurrentAddress] = useState("Rua Exemplo, 123"); // Placeholder for user's selected address
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between sticky top-0 z-10 rounded-b-xl">
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-indigo-600" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-gray-700 font-medium hover:bg-gray-100 rounded-lg">
                {currentAddress} <span className="ml-1 text-xs text-gray-500">▼</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-lg shadow-md">
              <DropdownMenuLabel>Endereço de Entrega</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert("Editar/Alterar Endereço")}>
                <MapPin className="mr-2 h-4 w-4" /> Editar/Alterar
              </DropdownMenuItem>
              {/* Add more address options here */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>
          {notificationCount > 0 && (
            <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
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
          <Link to="/" className="flex flex-col items-center text-gray-600 hover:text-indigo-600 p-2 rounded-lg transition-colors">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Início</span>
          </Link>
          <Link to="/search" className="flex flex-col items-center text-gray-600 hover:text-indigo-600 p-2 rounded-lg transition-colors">
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">Buscar</span>
          </Link>
          <Link to="/orders" className="flex flex-col items-center text-gray-600 hover:text-indigo-600 p-2 rounded-lg transition-colors">
            <ShoppingBag className="h-5 w-5" />
            <span className="text-xs mt-1">Pedidos</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex flex-col items-center text-gray-600 hover:text-indigo-600 p-2 rounded-lg transition-colors h-auto">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={user?.user_metadata?.avatar_url || "https://github.com/shadcn.png"} />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <span className="text-xs mt-1">Perfil</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-lg shadow-md mb-2">
              <DropdownMenuLabel>{user?.email || "Meu Perfil"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" /> Ver Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
};

export default ConsumerLayout;