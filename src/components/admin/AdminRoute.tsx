import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const checkAdminStatus = async () => {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    // If the RPC fails (e.g., user not logged in), it's not an admin.
    console.error('Admin check failed:', error.message);
    return false;
  }
  return data;
};

const AdminRoute = () => {
  const { user, loading: authLoading } = useAuth();
  
  const { data: isAdmin, isLoading: isAdminLoading } = useQuery({
    queryKey: ['isAdminCheck', user?.id],
    queryFn: checkAdminStatus,
    enabled: !authLoading && !!user,
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (authLoading || (user && isAdminLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="space-y-4 w-1/2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isAdmin) {
    return <Outlet />;
  } else {
    // Redirect non-admins to the home page
    return <Navigate to="/" replace />;
  }
};

export default AdminRoute;