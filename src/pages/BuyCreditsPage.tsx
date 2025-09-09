import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import MobilePageHeader from '@/components/MobilePageHeader';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/utils/formatters'; // Importando formatPrice

const fetchCreditPackages = async () => {
  const { data, error } = await supabase
    .from('credit_packages')
    .select('*')
    .eq('is_active', true)
    .order('amount', { ascending: true });
  if (error) throw error;
  return data;
};

const BuyCreditsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { data: packages, isLoading: isLoadingPackages } = useQuery({
    queryKey: ['creditPackages'],
    queryFn: fetchCreditPackages,
  });

  const handlePurchase = async () => {
    if (!user) {
      showError('Você precisa estar logado para comprar créditos.');
      return navigate('/auth');
    }
    if (!selectedPackageId) {
      showError('Por favor, selecione um pacote de créditos.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { packageId: selectedPackageId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        throw new Error('URL de checkout do Stripe não recebida.');
      }
    } catch (error: any) {
      console.error('Erro ao iniciar o checkout do Stripe:', error);
      showError(`Erro ao iniciar o pagamento: ${error.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <MobilePageHeader title="Comprar Créditos" />
      <main className="flex-1 p-4 space-y-6">
        <h2 className="text-xl font-bold text-center">Escolha seu Pacote de Créditos</h2>
        
        {isLoadingPackages ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : packages && packages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedPackageId === pkg.id && 'ring-2 ring-accent'
                )}
                onClick={() => setSelectedPackageId(pkg.id)}
              >
                <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                  <DollarSign className="h-8 w-8 text-primary" />
                  <h3 className="text-2xl font-bold">{pkg.amount} Créditos</h3>
                  <p className="text-muted-foreground">{pkg.description}</p>
                  <p className="text-3xl font-extrabold text-accent">{formatPrice(pkg.price_in_cents)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Nenhum pacote de créditos disponível no momento.</p>
        )}

        <Button 
          className="w-full h-12 text-lg bg-accent hover:bg-accent/90"
          onClick={handlePurchase}
          disabled={!selectedPackageId || isProcessingPayment}
        >
          {isProcessingPayment ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processando Pagamento...
            </>
          ) : (
            'Comprar Agora'
          )}
        </Button>
      </main>
    </div>
  );
};

export default BuyCreditsPage;