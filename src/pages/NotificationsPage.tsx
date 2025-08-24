"use client";

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { BellRing, Trash2, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Database } from '@/types/supabase';
import usePageMetadata from "@/hooks/usePageMetadata";

type Notification = Database['public']['Tables']['notifications']['Row'];

const fetchNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Notification[];
};

const NotificationsPage = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications, isLoading, isError, error } = useQuery<Notification[]>({
    queryKey: ['notificationsPageData', user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notificationsPageData', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  usePageMetadata({
    title: "Minhas Notificações - Trokazz",
    description: "Mantenha-se atualizado sobre as atividades da sua conta no Trokazz.",
    keywords: "notificações, alertas, atividades, trokazz",
    ogUrl: window.location.href,
  });

  const handleMarkAllAsRead = async () => {
    if (!user || !notifications || notifications.length === 0) return;

    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) {
      showSuccess("Todas as notificações já estão lidas!");
      return;
    }

    const toastId = showLoading("Marcando todas como lidas...");
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess("Todas as notificações foram marcadas como lidas.");
      queryClient.invalidateQueries({ queryKey: ['notificationsPageData', user.id] });
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Não foi possível marcar como lidas.");
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const toastId = showLoading("Removendo notificação...");
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess("Notificação removida.");
      queryClient.invalidateQueries({ queryKey: ['notificationsPageData', user?.id] });
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Não foi possível remover a notificação.");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return <p className="text-red-500 text-center py-4">Erro ao carregar notificações: {error?.message}</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <CardTitle>Minhas Notificações</CardTitle>
            <CardDescription>Mantenha-se atualizado sobre as atividades da sua conta.</CardDescription>
          </div>
        </div>
        {notifications && notifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
            <CheckCircle className="mr-2 h-4 w-4" /> Marcar todas como lidas
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications && notifications.length > 0 ? (
          notifications.map(n => (
            <div key={n.id} className={`flex items-center justify-between p-3 rounded-lg border ${!n.is_read ? 'bg-muted' : ''}`}>
              <Link to={n.link || '#'} className="flex-1 flex flex-col items-start pr-4">
                <p className={`${!n.is_read ? 'font-semibold' : 'text-muted-foreground'}`}>{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteNotification(n.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <BellRing className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Você não tem nenhuma notificação.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationsPage;