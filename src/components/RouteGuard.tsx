import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MaintenancePage from "@/pages/Maintenance";
import { useLocation } from "react-router-dom";

const fetchSiteSettings = async () => {
    const { data, error } = await supabase.from("site_settings").select("key, value");
    if (error) throw new Error(error.message);
    
    const settingsObj: { [key: string]: string } = data.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
    }, {});
    return settingsObj;
};

const checkAdminStatus = async () => {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return data;
};

const RouteGuard = ({ children }: { children: React.ReactNode }) => {
    const { user, loading: authLoading } = useAuth();
    const location = useLocation();

    const { data: settings, isLoading: settingsLoading } = useQuery({
        queryKey: ['siteSettingsGate'],
        queryFn: fetchSiteSettings,
        staleTime: 60 * 1000, // Cache for 1 minute
    });

    const { data: isAdmin, isLoading: isAdminLoading } = useQuery({
        queryKey: ['isAdminGate', user?.id],
        queryFn: checkAdminStatus,
        enabled: !authLoading && !!user,
    });

    const isLoading = settingsLoading || authLoading || (user && isAdminLoading);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
        );
    }

    const isMaintenanceMode = settings?.maintenance_mode === 'true';
    const canAccessAdmin = isAdmin && location.pathname.startsWith('/admin');

    if (isMaintenanceMode && !canAccessAdmin) {
        return <MaintenancePage />;
    }

    return <>{children}</>;
};

export default RouteGuard;