"use client";

import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Store, 
  Package, 
  Settings, 
  Users, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  Bell,
  BarChart3,
  Bike,
  DollarSign,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import RoleSwitcher from "../shared/RoleSwitcher";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import NotificationList from "@/components/shared/NotificationList";

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const { user, signOut, loading: authLoading } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const activeRole = localStorage.getItem('active_role') || user.user_metadata?.role;
      setRole(activeRole);
    }
  }, [user, location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const merchantLinks = [
    { label: "Dashboard", path: "/merchant/dashboard", icon: LayoutDashboard },
    { label: "Meu Cardápio", path: "/merchant/menu", icon: Package },
    { label: "Relatórios", path: "/merchant/reports", icon: BarChart3 },
    { label: "Configurações", path: "/merchant/settings", icon: Settings },
  ];

  const adminLinks = [
    { label: "Visão Geral", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Validar Lojistas", path: "/admin/merchants", icon: ShieldCheck },
    { label: "Validar Entregadores", path: "/admin/drivers", icon: Bike },
    { label: "Valor da Entrega", path: "/admin/delivery-fees", icon: DollarSign },
    { label: "Usuários", path: "/admin/users", icon: Users },
  ];

  const links = role === "ADMIN" ? adminLinks : merchantLinks;
  
  if (authLoading || !user || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-indigo-900 text-white z-50 transition-transform duration-300 transform lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-brand-accent p-2 rounded-lg">
              <Store className="h-6 w-6 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">FoodAdmin</h1>
          </div>

          <nav className="flex-1 space-y-1">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                    isActive 
                      ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" 
                      : "text-indigo-100 hover:bg-white/10"
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/10">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-indigo-100 hover:bg-white/10 hover:text-white rounded-xl gap-3"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Sair da conta
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="ml-auto flex items-center gap-4">
            <RoleSwitcher className="hidden sm:flex" />
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative text-gray-500 hover:bg-gray-50">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-[10px] font-black text-white border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md rounded-l-3xl p-6">
                <NotificationList />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900">{user?.email}</p>
                <p className="text-[10px] text-brand-accent font-bold uppercase tracking-wider">{role}</p>
              </div>
              <Avatar className="h-8 w-8 border-2 border-indigo-100">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">U</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;