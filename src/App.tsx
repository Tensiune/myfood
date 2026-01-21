import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AddressProvider } from "./context/AddressContext";
import { PaymentProvider } from "./context/PaymentContext";
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
import CartPage from "./pages/consumer/CartPage";
import CheckoutPage from "./pages/consumer/CheckoutPage";
import InboxPage from "./pages/consumer/InboxPage";
import ChatPage from "./pages/consumer/ChatPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AddressProvider>
        <PaymentProvider>
          <CartProvider>
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
                    <Route path="/inbox" element={<InboxPage />} />
                    <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    {/* Placeholder Routes for Profile Page Links */}
                    <Route path="/invite-friends" element={<PlaceholderPage title="Indicar Amigos" />} />
                    <Route path="/share-app" element={<PlaceholderPage title="Compartilhar App" />} />
                    <Route path="/rate-app" element={<PlaceholderPage title="Avaliar App" />} />
                    <Route path="/settings" element={<PlaceholderPage title="Configurações de Privacidade" />} />
                    <Route path="/terms" element={<PlaceholderPage title="Termos de Uso" />} />
                    <Route path="/privacy-policy" element={<PlaceholderPage title="Política de Privacidade" />} />
                  </Route>
                  {/* Checkout and Chat routes are full screen */}
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/chat/:id" element={<ChatPage />} />
                </Route>

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </PaymentProvider>
      </AddressProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;