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
import { useNotifications } from "@/context/NotificationContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AddressManager from "@/components/consumer/AddressManager";
import NotificationList from "@/components/shared/NotificationList";

const ConsumerLayout = () => {
  const [user, setUser] = useState<any>(null);
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { getItemCount } = useCart();
  const { selectedAddress } = useAddresses();
  const { unreadCount, addNotification } = useNotifications();
  const cartItemCount = getItemCount();

  useEffect(() => {
    const fetchUserAndSetupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Monitorar pedidos em tempo real para este usuário
        const channel = supabase
          .channel(`consumer_notifs_${user.id}`)
          .on(
            'postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` }, 
            (payload) => {
              // Se o status mudou para CANCELLED (Recusado pela loja)
              if (payload.new.status === 'CANCELLED' && payload.old.status !== 'CANCELLED') {
                addNotification({
                  title: "Pedido Recusado",
                  message: "Lamentamos, mas a loja não consegue atender seu pedido agora. Que tal tentar outra loja ou pedir novamente mais tarde?",
                  type: "info",
                  link: "/orders"
                });
              }
            }
          )
          .subscribe();

        return () => { supabase.removeChannel(channel); };
      }
    };
    fetchUserAndSetupRealtime();
  }, [addNotification]);

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
                <SheetTitle className="text-xl font-bold text-center text-indigo-900">Onde você quer receber?</SheetTitle>
              </SheetHeader>
              <div className="px-2"><AddressManager /></div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={isNotifOpen} onOpenChange={setIsNotifOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Bell className="h-6 w-6 text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-white border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md rounded-l-3xl">
              <NotificationList onClose={() => setIsNotifOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4 max-w-2xl">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-100 p-2 fixed bottom-0 left-0 right-0 z-10 safe-area-bottom">
        <div className="flex justify-around items-center max-w-md mx-auto">
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
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-white">
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