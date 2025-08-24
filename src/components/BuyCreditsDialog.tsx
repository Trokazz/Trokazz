import { useState, useEffect } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Gem, Loader2 } from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

// Definindo a interface para o retorno da função RPC apply_promo_code
interface ApplyPromoCodeResult {
  status: 'success' | 'error';
  message: string;
  benefit_type?: 'credit_bonus' | 'discount_credits' | 'free_boost';
  benefit_value?: number;
}

type AppliedPromo = {
  type: 'credit_bonus' | 'discount_credits' | 'free_boost';
  value: number;
  code: string;
  message: string;
} | null;

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
  const queryClient = useQueryClient();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["creditPackages"],
    queryFn: fetchCreditPackages,
  });

  // Reset promo code state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPromoCodeInput("");
      setAppliedPromo(null);
    }
  }, [isOpen]);

  const handleApplyPromoCode = async () => {
    if (!user) {
      showError("Você precisa estar logado para aplicar um código promocional.");
      return;
    }
    if (!promoCodeInput.trim()) {
      showError("Por favor, insira um código promocional.");
      return;
    }

    const toastId = showLoading("Aplicando código promocional...");
    try {
      const { data, error } = await supabase.rpc('apply_promo_code', {
        p_user_id: user.id,
        p_code: promoCodeInput.trim(),
      });

      // Faz o cast do retorno para a interface definida
      const result = data as unknown as ApplyPromoCodeResult; // Adicionado 'unknown as' para asserção mais forte

      if (error) throw error;
      if (result.status === 'error') throw new Error(result.message);

      dismissToast(toastId);
      showSuccess(result.message);
      setAppliedPromo({
        type: result.benefit_type!, // Usamos ! pois a validação de status 'success' implica que esses campos existem
        value: result.benefit_value!,
        code: promoCodeInput.trim(),
        message: result.message,
      });
      // Invalidate user credits query if credits were directly added (credit_bonus or free_boost)
      if (result.benefit_type === 'credit_bonus' || result.benefit_type === 'free_boost') {
        queryClient.invalidateQueries({ queryKey: ["profilePageData", user.id] });
      }
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Não foi possível aplicar o código promocional.");
      setAppliedPromo(null); // Clear any previous applied promo on error
    }
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!user) {
      showError("Você precisa estar logado para comprar créditos.");
      return;
    }
    if (!stripePromise) {
      showError("A configuração de pagamento não está completa. Por favor, contate o suporte.");
      return;
    }

    // If a discount promo code is applied, and it's not a free credit type
    let finalPriceInCents = pkg.price_in_cents;
    if (appliedPromo && appliedPromo.type === 'discount_credits') {
      finalPriceInCents = Math.round(pkg.price_in_cents * (1 - appliedPromo.value / 100));
      if (finalPriceInCents < 0) finalPriceInCents = 0; // Ensure price doesn't go negative
    }

    // If the promo code gives free credits, no need to go to Stripe for this package
    if (appliedPromo && (appliedPromo.type === 'credit_bonus' || appliedPromo.type === 'free_boost')) {
        showSuccess("Créditos já foram adicionados pelo código promocional!");
        onOpenChange(false); // Close dialog
        return;
    }

    setIsProcessingPayment(true);
    const toastId = showLoading("Redirecionando para o pagamento...");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          amount: pkg.amount,
          priceInCents: finalPriceInCents, // Use final price
          description: pkg.description || `Pacote de ${pkg.amount} créditos`,
          promoCode: appliedPromo ? appliedPromo.code : null, // Pass promo code to webhook if needed for logging
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
          {/* Promo Code Section */}
          <div className="space-y-2">
            <Label htmlFor="promo-code">Código Promocional</Label>
            <div className="flex gap-2">
              <Input
                id="promo-code"
                placeholder="Insira seu código"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value)}
                disabled={!!appliedPromo}
              />
              <Button onClick={handleApplyPromoCode} disabled={!promoCodeInput.trim() || !!appliedPromo}>
                Aplicar
              </Button>
            </div>
            {appliedPromo && (
              <p className="text-sm text-green-600">
                {appliedPromo.message}
              </p>
            )}
          </div>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          ) : packages && packages.length > 0 ? (
            packages.map((pkg) => {
              let displayPrice = pkg.price_in_cents;
              let originalPrice = pkg.price_in_cents;

              if (appliedPromo && appliedPromo.type === 'discount_credits') {
                displayPrice = Math.round(pkg.price_in_cents * (1 - appliedPromo.value / 100));
                if (displayPrice < 0) displayPrice = 0;
              }

              const formattedOriginalPrice = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(originalPrice / 100);
              const formattedDisplayPrice = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(displayPrice / 100);

              return (
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
                    disabled={isProcessingPayment || !stripePublishableKey || (appliedPromo && (appliedPromo.type === 'credit_bonus' || appliedPromo.type === 'free_boost'))}
                  >
                    {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {appliedPromo && appliedPromo.type === 'discount_credits' ? (
                      <>
                        <span className="line-through text-muted-foreground mr-2">{formattedOriginalPrice}</span>
                        {formattedDisplayPrice}
                      </>
                    ) : (
                      formattedDisplayPrice
                    )}
                  </Button>
                </div>
              );
            })
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