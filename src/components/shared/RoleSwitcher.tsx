"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, Store, Bike, ShieldCheck, Check, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/types/auth";
import { showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

// Helper function to determine available roles based on user metadata
const getAvailableRoles = (user: any): UserRole[] => {
    const roles: UserRole[] = ['CONSUMER'];
    const metadataRole = user.user_metadata?.role;

    if (metadataRole === 'ADMIN') roles.push('ADMIN');
    if (metadataRole === 'MERCHANT') roles.push('MERCHANT');
    if (metadataRole === 'DRIVER') roles.push('DRIVER');
    
    return Array.from(new Set(roles));
};

// Helper function to get the target path based on role and user status
const getRolePath = (role: UserRole, user: any) => {
    switch (role) {
        case 'CONSUMER': return '/';
        case 'MERCHANT': 
            return user?.user_metadata?.status === 'NEEDS_SETUP' ? '/merchant/setup' : '/merchant/dashboard';
        case 'DRIVER': 
            return user?.user_metadata?.status === 'NEEDS_SETUP' ? '/driver/setup' : '/driver/orders';
        case 'ADMIN': return '/admin/dashboard';
        default: return '/';
    }
};

const getRoleLabel = (role: UserRole) => {
    switch (role) {
        case 'CONSUMER': return 'Consumidor';
        case 'MERCHANT': return 'Lojista';
        case 'DRIVER': return 'Entregador';
        case 'ADMIN': return 'Administrador';
        default: return 'Perfil';
    }
};

const getRoleIcon = (role: UserRole) => {
    switch (role) {
        case 'CONSUMER': return User;
        case 'MERCHANT': return Store;
        case 'DRIVER': return Bike;
        case 'ADMIN': return ShieldCheck;
        default: return User;
    }
};

interface RoleSwitcherProps {
    className?: string;
    variant?: "button" | "dropdown";
}

const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ className, variant = "dropdown" }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
    const [activeRole, setActiveRole] = useState<UserRole | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                setAvailableRoles(getAvailableRoles(user));
                setActiveRole(localStorage.getItem('active_role') as UserRole || 'CONSUMER');
            }
        };
        fetchUser();
    }, []);

    const handleRoleSelect = (role: UserRole) => {
        if (role === activeRole) return;

        localStorage.setItem('active_role', role);
        setActiveRole(role);
        showSuccess(`Perfil alterado para ${getRoleLabel(role)}.`);
        
        if (user) {
            const targetPath = getRolePath(role, user);
            navigate(targetPath);
        }
    };

    if (!user || availableRoles.length <= 1) {
        return null; // Only show if user has more than one role
    }

    const currentRoleLabel = getRoleLabel(activeRole as UserRole);
    const CurrentIcon = getRoleIcon(activeRole as UserRole);

    if (variant === "button") {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={cn("rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 gap-2", className)}>
                        <CurrentIcon className="h-4 w-4 text-indigo-600" />
                        <span className="font-bold">{currentRoleLabel}</span>
                        <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl p-2 shadow-lg">
                    <DropdownMenuLabel className="text-sm font-bold text-indigo-900">Alternar Perfil</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableRoles.map((role) => {
                        const Icon = getRoleIcon(role);
                        const label = getRoleLabel(role);
                        const isActive = role === activeRole;
                        return (
                            <DropdownMenuItem 
                                key={role} 
                                onClick={() => handleRoleSelect(role)}
                                className={cn(
                                    "flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer",
                                    isActive ? "bg-indigo-50 text-indigo-700 font-bold" : "text-gray-700 hover:bg-gray-50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5" />
                                    <span>{label}</span>
                                </div>
                                {isActive && <Check className="h-4 w-4 text-brand-accent" />}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    // Default dropdown variant for DashboardLayout
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={cn("flex items-center gap-2 rounded-xl text-gray-700 hover:bg-gray-100", className)}>
                    <CurrentIcon className="h-5 w-5 text-indigo-600" />
                    <span className="font-bold hidden sm:inline">{currentRoleLabel}</span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl p-2 shadow-lg">
                <DropdownMenuLabel className="text-sm font-bold text-indigo-900">Alternar Perfil</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableRoles.map((role) => {
                    const Icon = getRoleIcon(role);
                    const label = getRoleLabel(role);
                    const isActive = role === activeRole;
                    return (
                        <DropdownMenuItem 
                            key={role} 
                            onClick={() => handleRoleSelect(role)}
                            className={cn(
                                "flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer",
                                isActive ? "bg-indigo-50 text-indigo-700 font-bold" : "text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5" />
                                <span>{label}</span>
                            </div>
                            {isActive && <Check className="h-4 w-4 text-brand-accent" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default RoleSwitcher;