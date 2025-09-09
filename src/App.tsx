import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import CategoriesPage from "./pages/Categories";
import AdDetails from "./pages/AdDetails"; // Usando AdDetails como a página principal
import ReportAdPage from "./pages/ReportAdPage";
import AuthPage from "./pages/Auth";
import UserProfilePage from "./pages/UserProfilePage";
import CategoryResultsPage from "./pages/CategoryResults";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import ManageUsersPage from "./pages/admin/ManageUsers";
import ManageAdsPage from "./pages/admin/ManageAds";
import ManagePaymentsPage from "./pages/admin/ManagePayments";
import VouchersPage from "./pages/admin/Vouchers";
import PublishAdPage from "./pages/PublishAd";
import PlaceholderPage from "./components/PlaceholderPage";
import BoostAdPage from "./pages/BoostAdPage";
import RedeemVoucherPage from "./pages/RedeemVoucherPage";
import ChatPage from "./pages/ChatPage";
import ManageAdPage from "./pages/ManageAd";
import AdminRoute from "./components/admin/AdminRoute";
import UpdatePasswordPage from "./pages/UpdatePassword";
import AdminSettingsPage from "./pages/admin/Settings";
import RouteGuard from "./components/RouteGuard";
import MessagesPage from "./pages/MessagesPage";
import BuyCreditsPage from "./pages/BuyCreditsPage";
import MakeOfferPage from "./pages/MakeOfferPage";

import UserMyAdsPage from "./pages/user/MyAdsPage";
import UserMyOffersMadePage from "./pages/user/MyOffersMadePage"; // Caminho corrigido
import UserMyOffersReceivedPage from "./pages/user/MyOffersReceivedPage";
import UserFavoritesPage from "./pages/user/FavoritesPage";
import UserSettingsPage from "./pages/user/SettingsPage";
import UserCreditTransactionsPage from "./pages/user/UserCreditTransactionsPage";
import ManageCategoriesPage from "./pages/admin/ManageCategories";
import ManageReportsPage from "./pages/admin/ManageReports";
import ManageSupportTicketsPage from "./pages/admin/ManageSupportTickets";
import ManageVerificationRequestsPage from "./pages/admin/ManageVerificationRequests";
import ManageCreditPackagesPage from "./pages/admin/ManageCreditPackages";
import ManagePagesPage from "./pages/admin/ManagePages";
import ManageUserLevelsPage from "./pages/admin/ManageUserLevels";
import SystemLogsPage from "./pages/admin/SystemLogsPage";
import StaticPage from "./pages/StaticPage";
import AdminUserDetailsPage from "./pages/admin/UserDetailsPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { HelmetProvider } from 'react-helmet-async';
import PublicProfilePage from "./pages/PublicProfilePage";
import SubmitReviewPage from "./pages/SubmitReviewPage";
import ManageBannersPage from "./pages/admin/ManageBanners";
import VerificationRequestPage from "./pages/user/VerificationRequestPage";
import SupportTicketPage from "./pages/SupportTicketPage";
import UserMySupportTicketsPage from "./pages/user/MySupportTicketsPage"; // New import

const queryClient = new QueryClient();

const AppLayout = () => <Layout><Outlet /></Layout>;
const AdminAppLayout = () => <AdminLayout><Outlet /></AdminLayout>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner duration={3000} position="top-center" /> 
      <BrowserRouter>
        <HelmetProvider>
          <RouteGuard>
            <ErrorBoundary>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
                <Route path="/ad/:id" element={<AdDetails />} />
                <Route path="/privacy-policy" element={<StaticPage />} />
                <Route path="/terms-of-service" element={<StaticPage />} />
                <Route path="/contact" element={<StaticPage />} />
                <Route path="/about" element={<StaticPage />} />
                <Route path="/faq" element={<StaticPage />} />
                <Route path="/how-it-works" element={<StaticPage />} />
                <Route path="/profile/:id" element={<PublicProfilePage />} />
                <Route path="/submit-review/:sellerId" element={<SubmitReviewPage />} />
                <Route path="/profile/verify" element={<VerificationRequestPage />} />
                <Route path="/support" element={<SupportTicketPage />} />

                {/* Admin Routes */}
                <Route element={<AdminRoute />}>
                  <Route element={<AdminAppLayout />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<ManageUsersPage />} />
                    <Route path="/admin/users/:id" element={<AdminUserDetailsPage />} />
                    <Route path="/admin/ads" element={<ManageAdsPage />} />
                    <Route path="/admin/categories" element={<ManageCategoriesPage />} />
                    <Route path="/admin/reports" element={<ManageReportsPage />} />
                    <Route path="/admin/support-tickets" element={<ManageSupportTicketsPage />} />
                    <Route path="/admin/verification-requests" element={<ManageVerificationRequestsPage />} />
                    <Route path="/admin/pages" element={<ManagePagesPage />} />
                    <Route path="/admin/user-levels" element={<ManageUserLevelsPage />} />
                    <Route path="/admin/system-logs" element={<SystemLogsPage />} />
                    <Route path="/admin/payments" element={<ManagePaymentsPage />} />
                    <Route path="/admin/prometter/vouchers" element={<VouchersPage />} />
                    <Route path="/admin/prometter/credit-packages" element={<ManageCreditPackagesPage />} />
                    <Route path="/admin/prometter/metrics" element={<AdminDashboard />} />
                    <Route path="/admin/prometter/settings" element={<AdminSettingsPage />} />
                    <Route path="/admin/banners" element={<ManageBannersPage />} />
                  </Route>
                </Route>

                {/* User/Public Routes */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/category/:slug" element={<CategoryResultsPage />} />
                  <Route path="/profile" element={<UserProfilePage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/profile/support-tickets" element={<UserMySupportTicketsPage />} /> {/* New route */}
                </Route>

                <Route path="/report-ad/:id" element={<ReportAdPage />} />
                <Route path="/sell" element={<PublishAdPage />} />
                <Route path="/edit-ad/:id" element={<PublishAdPage />} />
                <Route path="/boost/:id" element={<BoostAdPage />} />
                <Route path="/redeem" element={<RedeemVoucherPage />} />
                <Route path="/buy-credits" element={<BuyCreditsPage />} />
                <Route path="/make-offer/:id" element={<MakeOfferPage />} />
                <Route path="/chat/:id" element={<ChatPage />} />
                <Route path="/manage-ad/:id" element={<ManageAdPage />} />
                
                <Route path="/profile/settings" element={<UserSettingsPage />} />
                <Route path="/profile/my-ads" element={<UserMyAdsPage />} />
                <Route path="/profile/my-offers-made" element={<UserMyOffersMadePage />} />
                <Route path="/profile/my-offers-received" element={<UserMyOffersReceivedPage />} />
                <Route path="/profile/favorites" element={<UserFavoritesPage />} />
                <Route path="/profile/user-settings" element={<UserSettingsPage />} />
                <Route path="/profile/transactions" element={<UserCreditTransactionsPage />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </RouteGuard>
        </HelmetProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;