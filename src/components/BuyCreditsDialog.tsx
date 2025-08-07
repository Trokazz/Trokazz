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
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Gem } from "lucide-react";
import { useState } from "react";

interface BuyCreditsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const creditPackages = [
  { amount: 50, price: "5,00", description: "Ideal para começar" },
  { amount: 120, price: "10,00", description: "20% de bônus!" },
  { amount: 300, price: "20,00", description: "O melhor custo-benefício" },
];

export const BuyCreditsDialog = ({ isOpen, onOpenChange }: BuyCreditsDialogProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePurchase = async (amount: number) => {
    setIsSubmitting(true);
    const toastId = showLoading("Adicionando créditos...");
    try {
      const { error } = await supabase.rpc('purchase_credits', { package_amount: amount });
      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`${amount} créditos adicionados com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      onOpenChange(false);
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Não foi possível adicionar os créditos.");
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
            Use créditos para impulsionar seus anúncios e vender mais rápido. (Simulação)
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          {creditPackages.map((pkg) => (
            <Card
              key={pkg.amount}
              className="text-center p-4 cursor-pointer hover:shadow-lg hover:border-primary transition-all"
              onClick={() => !isSubmitting && handlePurchase(pkg.amount)}
            >
              <CardContent className="p-2">
                <Gem className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{pkg.amount}</p>
                <p className="text-muted-foreground">Créditos</p>
                <p className="font-semibold mt-2">R$ {pkg.price}</p>
                <p className="text-xs text-muted-foreground">{pkg.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};