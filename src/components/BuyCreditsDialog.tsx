import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Gem, Loader2 } from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';

interface BuyCreditsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreditPackage = {
  id: string;
  amount: number;
  price_in_cents: number;
  description: string | null;
  is_active: boolean;
};

const fetchCreditPackages = async (): Promise<CreditPackage[]> => {
  const { data, error } = await supabase
    .from("credit_packages")
    .select("*")
    .eq("is_active", true)
    .order("price_in_cents");
  if (error) throw new Error(error.message);
  return data;
};

// Verifica se a chave pública do Stripe está definida
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const BuyCreditsDialog = ({ isOpen, onOpenChange }: BuyCreditsDialogProps) => {
  const { user } = useSession();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["creditPackages"],
    queryFn: fetchCreditPackages,
  });

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!user) {
      showError("Você precisa estar logado para comprar créditos.");
      return;
    }
    if (!stripePromise) {
      showError("A configuração de pagamento não está completa. Por favor, contate o suporte.");
      return;
    }

    setIsProcessingPayment(true);
    const toastId = showLoading("Redirecionando para o pagamento...");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          amount: pkg.amount,
          priceInCents: pkg.price_in_cents,
          description: pkg.description || `Pacote de ${pkg.amount} créditos`,
        },
      });

      if (invokeError) throw invokeError;
      if (!data?.sessionId) throw new Error("Não foi possível criar a sessão de checkout.");

      const stripe = await stripePromise;
      if (!stripe) throw new Error("Falha ao carregar o Stripe.");

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) throw stripeError;

    } catch (error: any) {
      dismissToast(toastId);
      console.error("Erro ao iniciar pagamento:", error);
      showError(error.context?.json?.error || error.message || "Não foi possível iniciar o processo de pagamento.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comprar Créditos</DialogTitle>
          <DialogDescription>
            Créditos podem ser usados para impulsionar seus anúncios e destacá-los.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          ) : packages && packages.length > 0 ? (
            packages.map((pkg) => (
              <div key={pkg.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Gem className="h-5 w-5 text-primary" />
                    {pkg.amount} Créditos
                  </p>
                  {pkg.description && <p className="text-sm text-muted-foreground">{pkg.description}</p>}
                </div>
                <Button
                  onClick={() => handlePurchase(pkg)}
                  disabled={isProcessingPayment || !stripePublishableKey}
                >
                  {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Comprar por {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pkg.price_in_cents / 100)}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground">Nenhum pacote de créditos disponível no momento.</p>
          )}
          {!stripePublishableKey && (
            <div className="text-center text-red-500 text-sm mt-4">
              Erro: Chave pública do Stripe não configurada.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuyCreditsDialog;