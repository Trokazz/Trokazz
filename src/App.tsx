import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { lazy } from "react";
import { Providers } from "./components/Providers";
import Root from "./components/Root";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const AuthTabs = lazy(() => import("./pages/AuthTabs"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ProfileMenuPage = lazy(() => import("./pages/ProfileMenuPage")); // NEW: Profile Menu Page
const EditProfilePage = lazy(() => import("./pages/EditProfilePage")); // NEW: Edit Profile Page
const MyAdsPage = lazy(() => import("./pages/MyAdsPage")); // NEW: My Ads Page
const OffersPage = lazy(() => import("./pages/OffersPage")); // NEW: Offers Page
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage")); // NEW: Analytics Page
const CreditTransactionsPage = lazy(() => import("./pages/CreditTransactionsPage")); // NEW: Credit Transactions Page
const NotificationsPage = lazy(() => import("./pages/NotificationsPage")); // NEW: Notifications Page
const FavoritesPage = lazy(() => import("./pages/FavoritesPage")); // NEW: Favorites Page
const VerificationPage = lazy(() => import("./pages/VerificationPage")); // NEW: Verification Page
const UserSupportTicketsPage = lazy(() => import("./pages/UserSupportTicketsPage")); // NEW: User Support Tickets Page
const MyReviewsPage = lazy(() => import("./pages/MyReviewsPage")); // NEW: My Reviews Page

const CreateAd = lazy(() => import("./pages/CreateAd"));
const EditMyAd = lazy(() => import("./pages/EditMyAd"));
const AdDetails = lazy(() => import("./pages/AdDetails"));
const AdsList = lazy(() => import("./pages/AdsList")); // Renamed from CategoryPage for clarity
const WantedAdsList = lazy(() => import("./pages/WantedAdsList"));
const CreateWantedAd = lazy(() => import("./pages/CreateWantedAd"));
const WantedAdDetails = lazy(() => import("./pages/WantedAdDetails"));
const ServicesList = lazy(() => import("./pages/ServicesList"));
const CreateServiceAd = lazy(() => import("./pages/CreateServiceAd"));
const ServiceDetails = lazy(() => import("./pages/ServiceDetails"));
const Conversation = lazy(() => import("./pages/Conversation"));
const UserTicketDetails = lazy(() => import("./pages/UserTicketDetails"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const UserDetails = lazy(() => import("./pages/admin/UserDetails"));
const ManageAds = lazy(() => import("./pages/admin/ManageAds"));
const EditAd = lazy(() => import("./pages/admin/EditAd"));
const ModerationCenter = lazy(() => import("./pages/admin/ModerationCenter"));
const ManageSupportTickets = lazy(() => import("./pages/admin/ManageSupportTickets"));
const TicketDetails = lazy(() => import("./pages/admin/TicketDetails"));
const SiteSettings = lazy(() => import("./pages/admin/SiteSettings"));
const ManageCategories = lazy(() => import("./pages/admin/ManageCategories"));
const ManageBanners = lazy(() => import("./pages/admin/ManageBanners"));
const ManageCreditPackages = lazy(() => import("./pages/admin/ManageCreditPackages"));
const ManagePromoCodes = lazy(() => import("./pages/admin/ManagePromoCodes"));
const SystemLogs = lazy(() => import("./pages/admin/SystemLogs"));
const InvestorDashboard = lazy(() => import("./pages/admin/InvestorDashboard"));
const Insights = lazy(() => import("./pages/admin/Insights"));
const SearchAnalyticsPage = lazy(() => import("./pages/admin/SearchAnalytics"));
const ManageUserLevels = lazy(() => import("./pages/admin/ManageUserLevels"));


const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <Index /> },
      { path: "/auth", element: <AuthTabs /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/anuncios", element: <AdsList /> }, // General ads list
      { path: "/anuncios/categoria/:slug", element: <AdsList /> },
      { path: "/anuncio/:id", element: <AdDetails /> },
      { path: "/procurados", element: <WantedAdsList /> },
      { path: "/procura/novo", element: <CreateWantedAd /> },
      { path: "/procura/:id", element: <WantedAdDetails /> },
      { path: "/servicos", element: <ServicesList /> },
      { path: "/servicos/novo", element: <CreateServiceAd /> },
      { path: "/servico/:id", element: <ServiceDetails /> },
      { path: "/contato", element: <Contact /> },
      { path: "/faq", element: <FAQ /> },
      { path: "/about-us", element: <AboutUs /> },
      { path: "/terms-of-service", element: <TermsOfService /> },
      { path: "/privacy-policy", element: <PrivacyPolicy /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/perfil", element: <ProfileMenuPage /> }, // NEW: Main profile menu
          { path: "/perfil/editar", element: <EditProfilePage /> }, // NEW: Edit Profile Page
          { path: "/perfil/meus-anuncios", element: <MyAdsPage /> }, // NEW: My Ads Page
          { path: "/perfil/minhas-ofertas", element: <OffersPage /> }, // NEW: Offers Page
          { path: "/perfil/desempenho", element: <AnalyticsPage /> }, // NEW: Analytics Page
          { path: "/perfil/historico-transacoes", element: <CreditTransactionsPage /> }, // NEW: Credit Transactions Page
          { path: "/perfil/notificacoes", element: <NotificationsPage /> }, // NEW: Notifications Page
          { path: "/perfil/favoritos", element: <FavoritesPage /> }, // NEW: Favorites Page
          { path: "/perfil/verificacao", element: <VerificationPage /> }, // NEW: Verification Page
          { path: "/perfil/meus-tickets", element: <UserSupportTicketsPage /> }, // NEW: User Support Tickets Page
          { path: "/perfil/meus-comentarios", element: <MyReviewsPage /> }, // NEW: My Reviews Page
          { path: "/perfil/anuncio/:id/editar", element: <EditMyAd /> },
          { path: "/perfil/support-tickets/:ticketId", element: <UserTicketDetails /> },
          { path: "/novo-anuncio", element: <CreateAd /> },
          { path: "/chat/:conversationId", element: <Conversation /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminProtectedRoute />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "users", element: <ManageUsers /> },
      { path: "users/:id", element: <UserDetails /> },
      { path: "ads", element: <ManageAds /> },
      { path: "ads/:id/edit", element: <EditAd /> },
      { path: "moderation-center", element: <ModerationCenter /> },
      { path: "support-tickets", element: <ManageSupportTickets /> },
      { path: "support-tickets/:ticketId", element: <TicketDetails /> },
      { path: "settings", element: <SiteSettings /> },
      { path: "categories", element: <ManageCategories /> },
      { path: "banners", element: <ManageBanners /> },
      { path: "credits", element: <ManageCreditPackages /> },
      { path: "promo-codes", element: <ManagePromoCodes /> },
      { path: "system-logs", element: <SystemLogs /> },
      { path: "investor-dashboard", element: <InvestorDashboard /> },
      { path: "insights", element: <Insights /> },
      { path: "search-analytics", element: <SearchAnalyticsPage /> },
      { path: "user-levels", element: <ManageUserLevels /> },
    ],
  },
]);

const App = () => (
  <Providers>
    <RouterProvider router={router} />
  </Providers>
);

export default App;