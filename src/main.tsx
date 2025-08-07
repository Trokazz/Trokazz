import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Providers } from "@/components/Providers";
import Root from "@/components/Root";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoot from "@/components/admin/AdminRoot";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import CreateAd from "@/pages/CreateAd";
import Profile from "@/pages/Profile";
import AdDetails from "@/pages/AdDetails";
import AdsList from "@/pages/AdsList";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ManageAds from "@/pages/admin/ManageAds";
import ManageUsers from "@/pages/admin/ManageUsers";
import ManageCategories from "@/pages/admin/ManageCategories";
import EditAd from "@/pages/admin/EditAd";
import EditMyAd from "@/pages/EditMyAd";
import PublicProfilePage from "@/pages/PublicProfilePage";
import Inbox from "@/pages/Inbox";
import Conversation from "@/pages/Conversation";
import CreateWantedAd from "@/pages/CreateWantedAd";
import WantedAdsList from "@/pages/WantedAdsList";
import CategoryPage from "@/pages/CategoryPage";
import CreateServiceAd from "@/pages/CreateServiceAd";
import ServicesList from "@/pages/ServicesList";
import ServiceDetails from "@/pages/ServiceDetails";
import UserDetails from "@/pages/admin/UserDetails";
import SiteSettings from "@/pages/admin/SiteSettings";
import Insights from "@/pages/admin/Insights";
import ManageBanners from "@/pages/admin/ManageBanners";
import SearchAnalyticsPage from "@/pages/admin/SearchAnalytics";
import InvestorDashboard from "@/pages/admin/InvestorDashboard";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Contact from "@/pages/Contact";
import ModerationCenter from "@/pages/admin/ModerationCenter";
import ManagePages from "@/pages/admin/ManagePages";
import "@/globals.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Index /> },
      { path: "anuncio/:id", element: <AdDetails /> },
      { path: "anuncios/categoria/:slug", element: <CategoryPage /> },
      { path: "anuncios", element: <AdsList /> },
      { path: "loja/:username", element: <PublicProfilePage /> },
      { path: "procurados", element: <WantedAdsList /> },
      { path: "servicos", element: <ServicesList /> },
      { path: "servico/:id", element: <ServiceDetails /> },
      { path: "politica-de-privacidade", element: <PrivacyPolicy /> },
      { path: "termos-de-servico", element: <TermsOfService /> },
      { path: "contato", element: <Contact /> },
      {
        path: "servicos/novo",
        element: <ProtectedRoute><CreateServiceAd /></ProtectedRoute>,
      },
      {
        path: "procurar/novo",
        element: <ProtectedRoute><CreateWantedAd /></ProtectedRoute>,
      },
      {
        path: "novo-anuncio",
        element: <ProtectedRoute><CreateAd /></ProtectedRoute>,
      },
      {
        path: "perfil",
        element: <ProtectedRoute><Profile /></ProtectedRoute>,
      },
      {
        path: "perfil/anuncio/:id/editar",
        element: <ProtectedRoute><EditMyAd /></ProtectedRoute>,
      },
      {
        path: "inbox",
        element: <ProtectedRoute><Inbox /></ProtectedRoute>,
      },
      {
        path: "chat/:conversationId",
        element: <ProtectedRoute><Conversation /></ProtectedRoute>,
      },
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/admin",
    element: <AdminRoot />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "investor-dashboard", element: <InvestorDashboard /> },
      { path: "moderation-center", element: <ModerationCenter /> },
      { path: "insights", element: <Insights /> },
      { path: "search-analytics", element: <SearchAnalyticsPage /> },
      { path: "ads", element: <ManageAds /> },
      { path: "ads/:id/edit", element: <EditAd /> },
      { path: "users", element: <ManageUsers /> },
      { path: "users/:id", element: <UserDetails /> },
      { path: "categories", element: <ManageCategories /> },
      { path: "banners", element: <ManageBanners /> },
      { path: "pages", element: <ManagePages /> },
      { path: "settings", element: <SiteSettings /> },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  }
]);

createRoot(document.getElementById("root")!).render(
  <Providers>
    <RouterProvider router={router} />
  </Providers>
);