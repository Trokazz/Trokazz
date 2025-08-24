import React, { Suspense } from "react";
import { useSession } from "@/contexts/SessionContext";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout"; // Importar AdminLayout
import AdminPageSkeleton from "./AdminPageSkeleton"; // Importar AdminPageSkeleton

const fetchProfile = async (userId: string | undefined) => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const AdminProtectedRoute = () => {
  const { user, loading: sessionLoading } = useSession();
  const location = useLocation();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: () => fetchProfile(user?.id),
    enabled: !sessionLoading && !!user,
  });

  const isLoading = sessionLoading || (!!user && profileLoading);

  // NOVO LOG: Loga a função do perfil
  if (!isLoading) {
    console.log("AdminProtectedRoute: User profile role:", profile?.role);
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-12 w-full mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  if (!user || !isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Se o usuário é admin, renderiza o layout de admin com as rotas filhas
  return (
    <AdminLayout>
      <Suspense fallback={<AdminPageSkeleton />}>
        <Outlet />
      </Suspense>
    </AdminLayout>
  );
};

export default AdminProtectedRoute;