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
import ConsumerRegisterPage from "./pages/auth/ConsumerRegisterPage";
import DriverRegisterPage from "./pages/auth/DriverRegisterPage";
import MerchantRegisterPage from "./pages/auth/MerchantRegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import RoleSelectionPage from "./pages/auth/RoleSelectionPage";
import AuthGuard from "./components/AuthGuard";
import ConsumerLayout from "./components/layout/ConsumerLayout";
import DashboardLayout from "./components/layout/DashboardLayout";
import DriverLayout from "./components/layout/DriverLayout";
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
import OrderTrackingPage from "./pages/consumer/OrderTrackingPage";
import ValidateMerchantsPage from "./pages/admin/ValidateMerchantsPage";
import ValidateDriversPage from "./pages/admin/ValidateDriversPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import MerchantOrdersPage from "./pages/merchant/MerchantOrdersPage";
import AvailableOrdersPage from "./pages/driver/AvailableOrdersPage";
import NavigationPage from "./pages/driver/NavigationPage";
import MerchantMenuPage from "./pages/merchant/MerchantMenuPage";
import MerchantReportsPage from "./pages/merchant/MerchantReportsPage";
import MerchantSetupPage from "./pages/merchant/MerchantSetupPage";
import MerchantSettingsPage from "./pages/merchant/MerchantSettingsPage";
import DriverSetupPage from "./pages/driver/DriverSetupPage";
import DriverProfilePage from "./pages/driver/DriverProfilePage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import DeliveryFeesPage from "./pages/admin/DeliveryFeesPage";

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
                <Route path="/consumer-register" element={<ConsumerRegisterPage />} />
                <Route path="/driver-register" element={<DriverRegisterPage />} />
                <Route path="/merchant-register" element={<MerchantRegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected Routes */}
                <Route element={<AuthGuard />}>
                  <Route path="/select-role" element={<RoleSelectionPage />} />
                  
                  {/* APP CONSUMIDOR */}
                  <Route element={<ConsumerLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/inbox" element={<InboxPage />} />
                    <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/track/:id" element={<OrderTrackingPage />} />
                    {/* Placeholders */}
                    <Route path="/invite-friends" element={<PlaceholderPage title="Indicar Amigos" />} />
                    <Route path="/share-app" element={<PlaceholderPage title="Compartilhar App" />} />
                    <Route path="/rate-app" element={<PlaceholderPage title="Avaliar App" />} />
                    <Route path="/settings" element={<PlaceholderPage title="Configurações" />} />
                    <Route path="/terms" element={<PlaceholderPage title="Termos de Uso" />} />
                    <Route path="/privacy-policy" element={<PlaceholderPage title="Privacidade" />} />
                  </Route>

                  {/* SISTEMA WEB (MERCHANT & ADMIN) */}
                  <Route element={<DashboardLayout />}>
                    {/* Merchant Routes */}
                    <Route path="/merchant/dashboard" element={<MerchantOrdersPage />} />
                    <Route path="/merchant/menu" element={<MerchantMenuPage />} />
                    <Route path="/merchant/reports" element={<MerchantReportsPage />} />
                    <Route path="/merchant/settings" element={<MerchantSettingsPage />} />
                    <Route path="/merchant/setup" element={<MerchantSetupPage />} />
                    
                    {/* Admin Routes */}
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/merchants" element={<ValidateMerchantsPage />} />
                    <Route path="/admin/drivers" element={<ValidateDriversPage />} />
                    <Route path="/admin/delivery-fees" element={<DeliveryFeesPage />} />
                    <Route path="/admin/users" element={<PlaceholderPage title="Gestão de Usuários" />} />
                  </Route>

                  {/* APP ENTREGADOR */}
                  <Route element={<DriverLayout />}>
                    <Route path="/driver/orders" element={<AvailableOrdersPage />} />
                    <Route path="/driver/map" element={<NavigationPage />} />
                    <Route path="/driver/profile" element={<DriverProfilePage />} />
                    <Route path="/driver/setup" element={<DriverSetupPage />} />
                  </Route>

                  {/* Shared/Utility Routes */}
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/chat/:id" element={<ChatPage />} />
                </Route>

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