import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy } from "react";
import Root from "@/components/Root";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";

// Lazy load pages for better performance
const Index = lazy(() => import("@/pages/Index"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword")); // Nova importação
const Profile = lazy(() => import("@/pages/Profile"));
const AdDetails = lazy(() => import("@/pages/AdDetails"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const CreateAd = lazy(() => import("@/pages/CreateAd"));
const EditMyAd = lazy(() => import("@/pages/EditMyAd"));
const Inbox = lazy(() => import("@/pages/Inbox"));
const Conversation = lazy(() => import("@/pages/Conversation"));
const WantedAdsList = lazy(() => import("@/pages/WantedAdsList"));
const CreateWantedAd = lazy(() => import("@/pages/CreateWantedAd"));
const ServicesList = lazy(() => import("@/pages/ServicesList"));
const CreateServiceAd = lazy(() => import("@/pages/CreateServiceAd"));
const ServiceDetails = lazy(() => import("@/pages/ServiceDetails"));
const PublicProfilePage = lazy(() => import("@/pages/PublicProfilePage"));
const Contact = lazy(() => import("@/pages/Contact"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Admin Pages
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const ManageAds = lazy(() => import("@/pages/admin/ManageAds"));
const EditAd = lazy(() => import("@/pages/admin/EditAd"));
const ManageUsers = lazy(() => import("@/pages/admin/ManageUsers"));
const UserDetails = lazy(() => import("@/pages/admin/UserDetails"));
const ManageCategories = lazy(() => import("@/pages/admin/ManageCategories"));
const ManageBanners = lazy(() => import("@/pages/admin/ManageBanners"));
const SiteSettings = lazy(() => import("@/pages/admin/SiteSettings"));
const ModerationCenter = lazy(() => import("@/pages/admin/ModerationCenter"));
const Insights = lazy(() => import("@/pages/admin/Insights"));
const SearchAnalytics = lazy(() => import("@/pages/admin/SearchAnalytics"));
const InvestorDashboard = lazy(() => import("@/pages/admin/InvestorDashboard"));
const ManageCreditPackages = lazy(() => import("@/pages/admin/ManageCreditPackages"));
const ManagePages = lazy(() => import("@/pages/admin/ManagePages"));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas de Login e Cadastro fora do Root para uma experiência dedicada */}
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} /> {/* Nova rota */}

        {/* Admin Routes - Agora são rotas de nível superior */}
        <Route path="admin" element={<AdminProtectedRoute />}>
          <Route index element={<AdminDashboard />} />
          <Route path="investor-dashboard" element={<InvestorDashboard />} />
          <Route path="moderation-center" element={<ModerationCenter />} />
          <Route path="insights" element={<Insights />} />
          <Route path="search-analytics" element={<SearchAnalytics />} />
          <Route path="ads" element={<ManageAds />} />
          <Route path="ads/:id/edit" element={<EditAd />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="users/:id" element={<UserDetails />} />
          <Route path="categories" element={<ManageCategories />} />
          <Route path="banners" element={<ManageBanners />} />
          <Route path="pages" element={<ManagePages />} />
          <Route path="credits" element={<ManageCreditPackages />} />
          <Route path="settings" element={<SiteSettings />} />
        </Route>

        {/* Todas as outras rotas (públicas e protegidas do usuário) permanecem sob o Root */}
        <Route path="/" element={<Root />}>
          <Route index element={<Index />} />
          <Route path="anuncio/:id" element={<AdDetails />} />
          <Route path="anuncios" element={<CategoryPage />} /> {/* For search results */}
          <Route path="anuncios/categoria/:slug" element={<CategoryPage />} />
          <Route path="procurados" element={<WantedAdsList />} />
          <Route path="servicos" element={<ServicesList />} />
          <Route path="servico/:id" element={<ServiceDetails />} />
          <Route path="loja/:username" element={<PublicProfilePage />} />
          <Route path="contato" element={<Contact />} />
          <Route path="politica-de-privacidade" element={<PrivacyPolicy />} />
          <Route path="termos-de-servico" element={<TermsOfService />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="perfil" element={<Profile />} />
            <Route path="perfil/anuncio/:id/editar" element={<EditMyAd />} />
            <Route path="novo-anuncio" element={<CreateAd />} />
            <Route path="procurar/novo" element={<CreateWantedAd />} />
            <Route path="servicos/novo" element={<CreateServiceAd />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="chat/:conversationId" element={<Conversation />} />
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;