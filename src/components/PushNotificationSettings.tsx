import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showLoading, showSuccess, showError, dismissToast } from '@/utils/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Chave pública VAPID (gerada no backend, pode ser uma variável de ambiente)
// Por enquanto, usaremos uma placeholder. Em um ambiente de produção, você geraria uma.
// Ex: web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 're_feHsSRhb_LWKoDkCERNRdyJb54MbmhPNb'; // Substitua pela sua chave pública VAPID

const PushNotificationSettings = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => Notification.permission);

  // Query para verificar se o usuário já tem uma assinatura push salva
  const { data: existingSubscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['pushSubscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    // Atualiza a permissão se ela mudar (ex: usuário altera nas configurações do navegador)
    const handlePermissionChange = () => {
      setNotificationPermission(Notification.permission);
    };
    // Não há um evento direto para isso, mas podemos verificar periodicamente ou ao focar
    window.addEventListener('focus', handlePermissionChange);
    return () => window.removeEventListener('focus', handlePermissionChange);
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeUserToPush = async () => {
    if (!user) {
      showError('Você precisa estar logado para ativar as notificações.');
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showError('Seu navegador não suporta notificações push.');
      return;
    }

    setIsSubscribing(true);
    const toastId = showLoading('Ativando notificações...');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subData = subscription.toJSON();
      if (!subData.endpoint || !subData.keys?.p256dh || !subData.keys?.auth) {
        throw new Error('Dados de assinatura incompletos.');
      }

      const { error } = await supabase.from('user_push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subData.endpoint,
          p256dh: subData.keys.p256dh,
          auth: subData.keys.auth,
        },
        { onConflict: 'user_id, endpoint' } // Atualiza se já existir para o mesmo endpoint
      );

      if (error) throw error;

      setNotificationPermission('granted');
      dismissToast(toastId);
      showSuccess('Notificações ativadas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pushSubscription', user.id] });
    } catch (error: any) {
      dismissToast(toastId);
      if (Notification.permission === 'denied') {
        showError('Você bloqueou as notificações. Por favor, altere as permissões do navegador.');
      } else {
        showError(error.message || 'Não foi possível ativar as notificações.');
      }
      console.error('Erro ao assinar push:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const unsubscribeUserFromPush = async () => {
    if (!user) return;
    setIsSubscribing(true);
    const toastId = showLoading('Desativando notificações...');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      const { error } = await supabase
        .from('user_push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotificationPermission('default'); // Ou 'denied' se o usuário desativar explicitamente
      dismissToast(toastId);
      showSuccess('Notificações desativadas.');
      queryClient.invalidateQueries({ queryKey: ['pushSubscription', user.id] });
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || 'Não foi possível desativar as notificações.');
      console.error('Erro ao desativar push:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  const isSubscribed = notificationPermission === 'granted' && existingSubscription;

  if (!isPushSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificações Push</CardTitle>
          <CardDescription>Seu navegador não suporta notificações push.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4">
          <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <p className="text-muted-foreground">
            Para receber notificações, por favor, use um navegador compatível (como Chrome, Firefox, Edge).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações Push</CardTitle>
        <CardDescription>
          Receba alertas importantes mesmo quando o aplicativo não estiver aberto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingSubscription ? (
          <div className="flex items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando status das notificações...</p>
          </div>
        ) : isSubscribed ? (
          <div className="flex items-center gap-4 p-4 bg-green-50/50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold">Notificações Ativadas!</h3>
              <p className="text-sm text-muted-foreground">Você receberá alertas importantes.</p>
            </div>
          </div>
        ) : notificationPermission === 'denied' ? (
          <div className="flex items-center gap-4 p-4 bg-red-50/50 dark:bg-red-900/20 rounded-lg">
            <XCircle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold">Notificações Bloqueadas</h3>
              <p className="text-sm text-muted-foreground">
                Por favor, vá nas configurações do seu navegador para permitir notificações para este site.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg">
            <Bell className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-semibold">Ativar Notificações</h3>
              <p className="text-sm text-muted-foreground">
                Permita que o Trokazz envie notificações para você.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {/* Removido o botão de ativar notificações */}
          {isSubscribed && (
            <Button variant="outline" onClick={unsubscribeUserFromPush} disabled={isSubscribing}>
              {isSubscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellOff className="mr-2 h-4 w-4" />}
              Desativar Notificações
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PushNotificationSettings;