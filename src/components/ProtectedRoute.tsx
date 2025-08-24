import React from "react";
import { useSession } from "@/contexts/SessionContext";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { Skeleton } from "./ui/skeleton";

const ProtectedRoute = () => {
  const { session, loading } = useSession();
  const location = useLocation();

  console.log("ProtectedRoute: loading =", loading, "session =", session);

  if (loading) {
    console.log("ProtectedRoute: Still loading session, showing skeleton.");
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

  // Reativando a lógica de redirecionamento
  if (!session) {
    console.log("ProtectedRoute: No session found, redirecting to login.");
    return <Navigate to="/auth?tab=login" state={{ from: location }} replace />;
  }

  console.log("ProtectedRoute: Session found, rendering protected content.");
  return <Outlet />;
};

export default ProtectedRoute;