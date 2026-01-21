import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import AuthGuard from "./components/AuthGuard";
import ConsumerLayout from "./components/layout/ConsumerLayout";
import HomePage from "./pages/consumer/HomePage";
import SearchPage from "./pages/consumer/SearchPage";
import OrdersPage from "./pages/consumer/OrdersPage";
import ProfilePage from "./pages/consumer/ProfilePage";
import PlaceholderPage from "./pages/consumer/PlaceholderPage";
import RestaurantDetailPage from "./pages/consumer/RestaurantDetailPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected Routes for Consumer App */}
          <Route element={<AuthGuard />}>
            <Route element={<ConsumerLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
              {/* Placeholder Routes for Profile Page Links */}
              <Route path="/invite-friends" element={<PlaceholderPage title="Indicar Amigos" />} />
              <Route path="/share-app" element={<PlaceholderPage title="Compartilhar App" />} />
              <Route path="/rate-app" element={<PlaceholderPage title="Avaliar App" />} />
              <Route path="/inbox" element={<PlaceholderPage title="Caixa de Entrada" />} />
              <Route path="/settings" element={<PlaceholderPage title="Configurações de Privacidade" />} />
              <Route path="/terms" element={<PlaceholderPage title="Termos de Uso" />} />
              <Route path="/privacy-policy" element={<PlaceholderPage title="Política de Privacidade" />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            </Route>
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;