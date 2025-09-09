import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showInfo } from './toast';

// Substitua com suas chaves VAPID geradas.
// Você precisará gerar estas chaves e configurá-las no seu backend (e.g., Edge Function)
// e no frontend.
// Exemplo: npx web-push generate-vapid-keys
// IMPORTANTE: Defina esta chave como uma variável de ambiente no seu projeto Vite, por exemplo, VITE_APP_PUBLIC_VAPID_KEY
const publicVapidKey = import.meta.env.VITE_APP_PUBLIC_VAPID_KEY; 

function urlBase64ToUint8Array(base64String: string) {
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
}

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    showError('Seu navegador não suporta Service Workers.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('Service Worker registrado com sucesso:', registration);
    return registration;
  } catch (error) {
    console.error('Falha ao registrar o Service Worker:', error);
    showError('Falha ao registrar o Service Worker.');
    return null;
  }
};

export const subscribeUserToPush = async (userId: string) => {
  if (!('PushManager' in window)) {
    showError('Seu navegador não suporta a API Push.');
    return;
  }
  if (!publicVapidKey) {
    showError('Chave VAPID pública não configurada. As notificações push não funcionarão.');
    return;
  }

  const registration = await registerServiceWorker();
  if (!registration) return;

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    });

    console.log('Inscrição Push bem-sucedida:', subscription);

    // Enviar a inscrição para o seu backend (Supabase)
    const { endpoint, expirationTime, keys } = subscription.toJSON();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error('Dados de inscrição incompletos.');
    }

    const { error } = await supabase.from('user_push_subscriptions').insert({
      user_id: userId,
      endpoint: endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    if (error) {
      throw new Error(error.message);
    }

    showSuccess('Notificações ativadas com sucesso!');
  } catch (error: any) {
    console.error('Falha ao inscrever o usuário para Push:', error);
    showError(`Falha ao ativar notificações: ${error.message}. Verifique se as chaves VAPID estão configuradas corretamente.`);
  }
};

export const unsubscribeUserFromPush = async (userId: string) => {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    try {
      await subscription.unsubscribe();
      console.log('Usuário desinscrito do Push com sucesso.');

      const { error } = await supabase.from('user_push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint);

      if (error) {
        throw new Error(error.message);
      }

      showInfo('Notificações desativadas.');
    } catch (error: any) {
      console.error('Falha ao desinscrever o usuário do Push:', error);
      showError(`Falha ao desativar notificações: ${error.message}`);
    }
  }
};