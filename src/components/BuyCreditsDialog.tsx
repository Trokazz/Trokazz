import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { showError, showLoading, dismissToast } from "@/utils/toast";
import { Gem, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "./ui/skeleton";

// Declara o objeto Stripe no escopo global para o TypeScript
declare global {
  interface Window {
    Stripe: any;
  }
}

interface BuyCreditsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreditPackage = {
  id: string;
  amount: number;
  price_in_cents: number;
  description: string | null;
};

const fetchCreditPackages = async (): Promise<CreditPackage[]> => {
  const { data, error } = await supabase
    .from('credit_packages')
    .select('*')
    .eq('is_active', true)
    .order('price_in_cents', { ascending: true });
  if (error) throw error;
  return data;
};

export const BuyCreditsDialog = ({ isOpen, onOpenChange }: BuyCreditsDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: creditPackages, isLoading: isLoadingPackages } = useQuery({
    queryKey: ['creditPackages'],
    queryFn: fetchCreditPackages,
  });

  const handlePurchase = async (selectedPackage: CreditPackage) => {
    const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!window.Stripe || !stripePublishableKey) {
      showError("A integração de pagamento não está configurada corretamente.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading("Iniciando pagamento seguro...");

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          amount: selectedPackage.amount,
          priceInCents: selectedPackage.price_in_cents,
          description: selectedPackage.description || `${selectedPackage.amount} Créditos`,
        },
      });

      if (error) throw error;
      if (!data || !data.sessionId) throw new Error("ID da sessão de checkout inválido.");

      const stripe = window.Stripe(stripePublishableKey);
      dismissToast(toastId);
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (stripeError) throw new Error(stripeError.message);

    } catch (err: any) {
      dismissToast(toastId);
      const errorMessage = err.context?.json?.error || err.message || "Ocorreu um erro desconhecido.";
      showError(errorMessage);
      console.error("Detailed payment error object:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comprar Créditos</DialogTitle>
          <DialogDescription>
            Use créditos para impulsionar seus anúncios e vender mais rápido.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          {isLoadingPackages ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4"><CardContent className="p-2 text-center"><Skeleton className="h-8 w-8 mx-auto mb-2 rounded-full" /><Skeleton className="h-7 w-12 mx-auto" /><Skeleton className="h-4 w-20 mx-auto mt-1" /><Skeleton className="h-5 w-16 mx-auto mt-2" /><Skeleton className="h-3 w-24 mx-auto mt-1" /></CardContent></Card>
            ))
          ) : (
            creditPackages?.map((pkg) => (
              <Card
                key={pkg.id}
                className="text-center p-4 cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                onClick={() => !isSubmitting && handlePurchase(pkg)}
              >
                <CardContent className="p-2">
                  <Gem className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold">{pkg.amount}</p>
                  <p className="text-muted-foreground">Créditos</p>
                  <p className="font-semibold mt-2">
                    R$ {(pkg.price_in_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {pkg.description && <p className="text-xs text-muted-foreground">{pkg.description}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </div>
        {isSubmitting && (
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Aguarde, redirecionando para o pagamento...
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};