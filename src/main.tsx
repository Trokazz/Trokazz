import { lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Providers } from "@/components/Providers";
import Root from "@/components/Root";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoot from "@/components/admin/AdminRoot";
import NotFound from "@/pages/NotFound"; // Importação direta
import "@/globals.css";

// Lazy load all page components
const Index = lazy(() => import("@/pages/Index"));
const Login = lazy(() => import("@/pages/Login"));
const CreateAd = lazy(() => import("@/pages/CreateAd"));
const Profile = lazy(() => import("@/pages/Profile"));
const AdDetails = lazy(() => import("@/pages/AdDetails"));
const AdsList = lazy(() => import("@/pages/AdsList"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const ManageAds = lazy(() => import("@/pages/admin/ManageAds"));
const ManageUsers = lazy(() => import("@/pages/admin/ManageUsers"));
const ManageCategories = lazy(() => import("@/pages/admin/ManageCategories"));
const EditAd = lazy(() => import("@/pages/admin/EditAd"));
const EditMyAd = lazy(() => import("@/pages/EditMyAd"));
const PublicProfilePage = lazy(() => import("@/pages/PublicProfilePage"));
const Inbox = lazy(() => import("@/pages/Inbox"));
const Conversation = lazy(() => import("@/pages/Conversation"));
const CreateWantedAd = lazy(() => import("@/pages/CreateWantedAd"));
const WantedAdsList = lazy(() => import("@/pages/WantedAdsList"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const CreateServiceAd = lazy(() => import("@/pages/CreateServiceAd"));
const ServicesList = lazy(() => import("@/pages/ServicesList"));
const ServiceDetails = lazy(() => import("@/pages/ServiceDetails"));
const UserDetails = lazy(() => import("@/pages/admin/UserDetails"));
const SiteSettings = lazy(() => import("@/pages/admin/SiteSettings"));
const Insights = lazy(() => import("@/pages/admin/Insights"));
const ManageBanners = lazy(() => import("@/pages/admin/ManageBanners"));
const SearchAnalyticsPage = lazy(() => import("@/pages/admin/SearchAnalytics"));
const InvestorDashboard = lazy(() => import("@/pages/admin/InvestorDashboard"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const Contact = lazy(() => import("@/pages/Contact"));
const ModerationCenter = lazy(() => import("@/pages/admin/ModerationCenter"));
const ManagePages = lazy(() => import("@/pages/admin/ManagePages"));
const ManageCreditPackages = lazy(() => import("@/pages/admin/ManageCreditPackages"));

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
      { path: "credits", element: <ManageCreditPackages /> },
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