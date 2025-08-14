import { Suspense, useEffect } from "react";
import Header from "./Header";
import SubHeader from "./SubHeader";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import MaintenancePage from "@/pages/Maintenance";
import { Skeleton } from "./ui/skeleton";
import MobileBottomNav from "./MobileBottomNav";
import PageSkeleton from "./PageSkeleton";
import PWAInstallPrompt from "./PWAInstallPrompt"; // Importando o novo componente

const fetchSiteSettings = async () => {
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) throw new Error(error.message);
  return data.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as { [key: string]: any });
};

const fetchProfileStatus = async (userId: string | undefined) => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, username, role")
    .eq("id", userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

const Root = () => {
  const { user, session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: fetchSiteSettings,
  });

  const { data: profileStatus, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profileStatus", user?.id],
    queryFn: () => fetchProfileStatus(user?.id),
    enabled: !sessionLoading && !!user,
  });

  const isLoading = isLoadingSettings || sessionLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-16 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isMaintenanceMode = settings?.maintenance_mode === 'true';
  const isAdmin = profileStatus?.role === 'admin';

  if (isMaintenanceMode && !isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <SubHeader />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="bg-card border-t py-6 hidden md:block">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2024 Trokazz. Todos os direitos reservados.</p>
          <nav className="flex gap-4">
            <Link to="/termos-de-servico" className="hover:text-primary">Termos de Serviço</Link>
            <Link to="/politica-de-privacidade" className="hover:text-primary">Política de Privacidade</Link>
            <Link to="/contato" className="hover:text-primary">Contato</Link>
          </nav>
        </div>
      </footer>
      <MobileBottomNav />
      <PWAInstallPrompt /> {/* Adicionando o componente aqui */}
    </div>
  );
};

export default Root;