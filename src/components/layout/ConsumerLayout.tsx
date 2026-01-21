import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Home, Search, ShoppingBag, User, Bell, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useAddresses } from "@/context/AddressContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AddressManager from "@/components/consumer/AddressManager";

const ConsumerLayout = () => {
  const [notificationCount, setNotificationCount] = useState(3);
  const [user, setUser] = useState<any>(null);
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { getItemCount } = useCart();
  const { selectedAddress } = useAddresses();
  const cartItemCount = getItemCount();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session) navigate("/login");
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const navItems = [
    { path: "/", icon: Home, label: "Início" },
    { path: "/search", icon: Search, label: "Buscar" },
    { path: "/orders", icon: ShoppingBag, label: "Pedidos" },
    { path: "/profile", icon: User, label: "Perfil" },
  ];

  const addressText = selectedAddress 
    ? `${selectedAddress.street}, ${selectedAddress.number}`
    : "Selecione um endereço";

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top Bar */}
      <header className="bg-white p-4 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center space-x-1 max-w-[70%]">
          <MapPin className="h-5 w-5 text-brand-accent shrink-0" />
          <Sheet open={isAddressSheetOpen} onOpenChange={setIsAddressSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="text-gray-800 font-bold hover:bg-transparent p-0 flex items-center overflow-hidden">
                <span className="truncate">{addressText}</span>
                <ChevronDown className="ml-1 h-4 w-4 text-brand-accent shrink-0" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-[2.5rem] overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-xl font-bold text-center text-indigo-900">Onde você quer receber seu pedido?</SheetTitle>
              </SheetHeader>
              <div className="px-2">
                <AddressManager />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-6 w-6 text-gray-700" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-white">
                  {notificationCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4 max-w-2xl">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-100 p-2 fixed bottom-0 left-0 right-0 z-10 safe-area-bottom">
        <div className="flex justify-around items-center max-w-md mx-auto relative">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center p-2 transition-colors relative",
                  isActive ? "text-brand-accent" : "text-gray-400"
                )}
              >
                <div className="relative">
                  {item.path === "/profile" && user ? (
                    <Avatar className={cn("h-6 w-6 border", isActive ? "border-brand-accent" : "border-transparent")}>
                      <AvatarImage src={user?.user_metadata?.avatar_url || "https://github.com/shadcn.png"} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                  {item.path === "/orders" && cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-white shadow-md">
                      {cartItemCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 font-bold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default ConsumerLayout;