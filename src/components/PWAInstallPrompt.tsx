import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Download } from 'lucide-react';
import { toast } from 'sonner';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      console.log('beforeinstallprompt event fired.');
    };

    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
      toast.success('Trokazz instalado!', {
        description: 'O aplicativo foi adicionado à sua tela inicial.',
      });
      console.log('PWA was installed.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed (for cases where appinstalled might not fire on first load)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setShowInstallButton(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      const { outcome } = await (deferredPrompt as any).userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      if (outcome === 'accepted') {
        // The appinstalled event should handle hiding the button
      } else {
        // User dismissed the prompt, keep the button visible
        setShowInstallButton(true);
      }
      setDeferredPrompt(null); // Clear the prompt after it's been used
    }
  };

  if (!showInstallButton) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 md:hidden">
      <Button
        onClick={handleInstallClick}
        className="bg-primary text-primary-foreground shadow-lg flex items-center gap-2 px-6 py-3 rounded-full"
      >
        <Download className="h-5 w-5" />
        Instalar App
      </Button>
    </div>
  );
};

export default PWAInstallPrompt;