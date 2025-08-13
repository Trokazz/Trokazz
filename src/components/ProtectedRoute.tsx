import React from "react";
import { useSession } from "@/contexts/SessionContext";
import { Navigate, useLocation, Outlet } from "react-router-dom"; // Adicionado Outlet
import { Skeleton } from "./ui/skeleton";

const ProtectedRoute = () => { // Removido { children }
  const { session, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container mx-auto p-4">
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

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />; // Renderiza Outlet para rotas aninhadas
};

export default ProtectedRoute;