import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Gift, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useMutation } from '@tanstack/react-query';

const MakeOfferPage = () => {
  const { id: adId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offerAmount, setOfferAmount] = useState<string>('');

  const createOfferMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate('/auth');
        throw new Error("Você precisa estar logado para fazer uma oferta.");
      }
      if (!adId) throw new Error("ID do anúncio não encontrado.");
      if (!offerAmount || parseFloat(offerAmount) <= 0) throw new Error("Por favor, insira um valor de oferta válido.");

      // First, get ad details to find the seller_id
      const { data: adData, error: adError } = await supabase
        .from('advertisements')
        .select('user_id')
        .eq('id', adId)
        .single();

      if (adError) throw new Error(`Erro ao buscar detalhes do anúncio: ${adError.message}`);
      if (!adData?.user_id) throw new Error("Vendedor do anúncio não encontrado.");

      const { error } = await supabase.from('offers').insert({
        ad_id: adId,
        buyer_id: user.id,
        seller_id: adData.user_id,
        offer_amount: parseFloat(offerAmount),
        status: 'pending',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Sua oferta foi enviada com sucesso! O vendedor será notificado.");
      navigate(`/ad/${adId}`);
    },
    onError: (error: any) => {
      showError(error.message);
    },
  });

  const isFormDisabled = createOfferMutation.isPending;

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex flex-col">
      <header className="flex items-center p-4 text-center relative">
        <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Fazer Oferta</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sua Oferta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="offer-amount">Valor da Oferta</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">R$</span>
                <Input
                  id="offer-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-9"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  disabled={isFormDisabled}
                />
              </div>
            </div>
            <Button
              className="w-full h-12 text-lg bg-accent hover:bg-accent/90"
              onClick={() => createOfferMutation.mutate()}
              disabled={isFormDisabled || !offerAmount || parseFloat(offerAmount) <= 0}
            >
              {isFormDisabled ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Gift className="mr-2 h-5 w-5" />
                  Enviar Oferta
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MakeOfferPage;