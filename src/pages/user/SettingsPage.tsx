import ProfileSettingsForm from "@/components/ProfileSettingsForm";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import MobilePageHeader from "@/components/MobilePageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff } from "lucide-react";
import { registerServiceWorker, subscribeUserToPush, unsubscribeUserFromPush } from "@/utils/pushNotifications";
import { useEffect, useState } from "react";
import { showError } from "@/utils/toast";

const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const UserSettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Removido o estado e lógica de notificações push daqui

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchUserProfile(user!.id),
    enabled: !!user,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Removido o useEffect para verificar o status da notificação push

  // Removido o handleTogglePushNotifications

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <MobilePageHeader title="Configurações" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <MobilePageHeader title="Configurações" />
      <main className="p-4 space-y-6">
        {profile ? (
          <ProfileSettingsForm profile={profile} onLogout={handleLogout} />
        ) : (
          <p>Não foi possível carregar o perfil.</p>
        )}
        {/* O card de Notificações Push foi removido daqui */}
      </main>
    </div>
  );
};

export default UserSettingsPage;