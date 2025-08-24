import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Tag, Loader2 } from "lucide-react"; // Importar Loader2

interface MakeOfferDialogProps {
  adId: string;
  sellerId: string;
  adTitle: string;
}

const offerSchema = z.object({
  amount: z.coerce.number().positive("A oferta deve ser um valor positivo."),
});

const MakeOfferDialog = ({ adId, sellerId, adTitle }: MakeOfferDialogProps) => {
  const { user } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<z.infer<typeof offerSchema>>({
    resolver: zodResolver(offerSchema),
  });

  const handleSubmit = async (values: z.infer<typeof offerSchema>) => {
    if (!user) {
      showError("Você precisa estar logado para fazer uma oferta.");
      return;
    }

    const toastId = showLoading("Enviando sua oferta...");

    try {
      const { error } = await supabase.from("offers").insert({
        ad_id: adId,
        buyer_id: user.id,
        seller_id: sellerId,
        offer_amount: values.amount,
      });

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Oferta enviada com sucesso!");
      setIsOpen(false);
      form.reset();
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Não foi possível enviar a oferta.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="lg">
          <Tag className="mr-2 h-5 w-5" />
          Fazer Oferta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fazer uma oferta</DialogTitle>
          <DialogDescription>
            Sua oferta para o anúncio "{adTitle}" será enviada ao vendedor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="amount">Sua oferta (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Ex: 1200.00"
              {...form.register("amount")}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                "Enviar Oferta"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MakeOfferDialog;