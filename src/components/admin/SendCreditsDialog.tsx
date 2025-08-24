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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react"; // Importar Loader2

interface SendCreditsDialogProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const sendCreditsSchema = z.object({
  amount: z.coerce.number().int().positive("A quantidade deve ser um número inteiro positivo."),
  description: z.string().min(5, "A descrição deve ter pelo menos 5 caracteres.").max(200, "A descrição não pode exceder 200 caracteres."),
});

const SendCreditsDialog = ({ userId, userName, isOpen, onOpenChange }: SendCreditsDialogProps) => {
  const { user: adminUser } = useSession();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof sendCreditsSchema>>({
    resolver: zodResolver(sendCreditsSchema),
  });

  const handleSubmit = async (values: z.infer<typeof sendCreditsSchema>) => {
    if (!adminUser) {
      showError("Você precisa estar logado como administrador.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading("Enviando créditos...");

    try {
      const { error } = await supabase.rpc('add_credits_by_admin', {
        p_user_id: userId,
        p_amount: values.amount,
        p_description: values.description,
        p_admin_id: adminUser.id,
      });

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Créditos enviados para ${userName} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["userDetails", userId] }); // Invalida para atualizar o saldo
      onOpenChange(false);
      form.reset();
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Não foi possível enviar os créditos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Créditos para {userName}</DialogTitle>
          <DialogDescription>
            Adicione créditos ao saldo deste usuário.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="amount">Quantidade de Créditos</Label>
              <Input
                id="amount"
                type="number"
                step="1"
                placeholder="Ex: 50"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="description">Descrição (Motivo)</Label>
              <Textarea
                id="description"
                placeholder="Ex: Bônus por participação em evento, compensação por problema técnico."
                {...form.register("description")}
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                "Enviar Créditos"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendCreditsDialog;