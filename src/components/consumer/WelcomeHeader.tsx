"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const WelcomeHeader: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
      }
    };

    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Bom dia";
      if (hour < 18) return "Boa tarde";
      return "Boa noite";
    };

    setGreeting(getGreeting());
    fetchUser();
  }, []);

  return (
    <div className="text-center space-y-2">
      <h1 className="text-4xl font-bold text-indigo-800 leading-tight">
        {greeting}, {userEmail ? userEmail.split('@')[0] : "Bem-vindo"}!
      </h1>
      <p className="text-lg text-gray-600">O que você quer pedir hoje?</p>
    </div>
  );
};

export default WelcomeHeader;