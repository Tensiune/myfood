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
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import RoleSwitcher from "../shared/RoleSwitcher";

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Use active_role from localStorage if available, otherwise fallback to metadata role
        const activeRole = localStorage.getItem('active_role') || user.user_metadata?.role;
        setRole(activeRole);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    { label: "Usuários", path: "/admin/users", icon: Users },
  ];

  const links = role === "ADMIN" ? adminLinks : merchantLinks;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
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
            <Button variant="ghost" size="icon" className="rounded-full text-gray-500">
              <Bell className="h-5 w-5" />
            </Button>
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

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;