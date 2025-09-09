import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CircleDollarSign, Loader2 } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/utils/formatters'; // Importando formatPrice

const durationPackages = [
  { id: '7d', name: '7 Dias', duration: '7 Dias' },
  { id: '15d', name: '15 Dias', duration: '15 Dias' },
  { id: '30d', name: '30 Dias', duration: '30 Dias' },
];

const fetchAdTitleAndSettings = async (adId: string) => {
    const { data: adData, error: adError } = await supabase
        .from('advertisements')
        .select('title')
        .eq('id', adId)
        .single();
    if (adError) throw new Error(`Erro ao buscar título do anúncio: ${adError.message}`);

    const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['boost_price', 'boost_duration_days']);
    if (settingsError) throw new Error(`Erro ao buscar configurações do site: ${settingsError.message}`);

    const settings = settingsData.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

    return {
        adTitle: adData.title,
        boostPrice: parseInt(settings.boost_price || '0'),
        boostDurationDays: parseInt(settings.boost_duration_days || '0'),
    };
};

const BoostAdPage = () => {
  const { id: adId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading: isLoadingData } = useQuery({
      queryKey: ['adBoostData', adId],
      queryFn: () => fetchAdTitleAndSettings(adId!),
      enabled: !!adId,
  });

  const { data: userCredits, isLoading: isLoadingCredits } = useQuery({
    queryKey: ['userCreditsForBoost', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user!.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data?.balance || 0;
    },
    enabled: !!user,
  });

  const boostAdMutation = useMutation({
    mutationFn: async () => {
      if (!user || !adId) {
        throw new Error("Usuário não autenticado ou ID do anúncio ausente.");
      }
      const { error } = await supabase.rpc('spend_credits_for_boost', { ad_id_param: adId });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess(`Anúncio "${data?.adTitle || 'selecionado'}" impulsionado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['userCreditsForBoost', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['manageAd', adId] });
      navigate('/profile');
    },
    onError: (error: any) => {
      showError(error.message);
    },
  });

  const boostCost = data?.boostPrice || 0;
  const hasEnoughCredits = (userCredits || 0) >= boostCost;
  const isBoosting = boostAdMutation.isPending;

  if (isLoadingData || isLoadingCredits) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex flex-col p-4">
      <header className="flex items-center mb-8">
        <Link to="/profile" className="p-2 -ml-2">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-bold mx-auto pr-8">Impulsionar Anúncio</h1>
      </header>

      <main className="flex-1 flex flex-col items-center text-center">
        <p className="max-w-xs mb-8">
          Impulsione seu anúncio "{data?.adTitle}" por {data?.boostDurationDays} dias!
        </p>

        <div className="w-full max-w-md space-y-6">
          <Card className="p-6 bg-card text-card-foreground">
            <h2 className="text-lg font-bold mb-2">Seu Saldo de Créditos</h2>
            <div className="flex items-center justify-center gap-2 text-3xl font-extrabold text-accent">
              <CircleDollarSign className="h-7 w-7" />
              <span>{userCredits}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Custo para impulsionar: {boostCost} créditos</p>
            {!hasEnoughCredits && (
              <p className="text-destructive text-sm mt-2">Você não tem créditos suficientes.</p>
            )}
            <Button asChild variant="outline" className="w-full mt-4">
              <Link to="/buy-credits">Comprar Mais Créditos</Link>
            </Button>
          </Card>
        </div>
      </main>

      <footer className="mt-auto pt-8">
        <Button 
          onClick={() => boostAdMutation.mutate()} 
          className="w-full max-w-md mx-auto bg-accent hover:bg-accent/90 h-12 text-lg rounded-full"
          disabled={!hasEnoughCredits || isBoosting}
        >
          {isBoosting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            'Impulsionar Anúncio'
          )}
        </Button>
      </footer>
    </div>
  );
};

export default BoostAdPage;