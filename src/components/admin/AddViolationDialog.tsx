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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";

interface AddViolationDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const violationSchema = z.object({
  reason: z.string().min(10, "O motivo deve ter pelo menos 10 caracteres."),
});

const AddViolationDialog = ({ userId, isOpen, onOpenChange }: AddViolationDialogProps) => {
  const { user: adminUser } = useSession();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof violationSchema>>({
    resolver: zodResolver(violationSchema),
  });

  const handleSubmit = async (values: z.infer<typeof violationSchema>) => {
    if (!adminUser) {
      showError("Você precisa estar logado como administrador.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading("Registrando advertência...");

    try {
      // 1. Insere a nova violação
      const { error: insertError } = await supabase.from("violations").insert({
        user_id: userId,
        admin_id: adminUser.id,
        reason: values.reason,
      });
      if (insertError) throw insertError;

      // 2. Conta o número de violações do usuário
      const { count, error: countError } = await supabase
        .from("violations")
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (countError) throw countError;

      // 3. Se o usuário tiver 3 ou mais violações, suspende a conta
      if (count && count >= 3) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ status: 'suspended' })
          .eq('id', userId);
        if (updateError) throw updateError;
        showSuccess("Advertência registrada. Usuário suspenso por atingir o limite de violações.");
      } else {
        showSuccess("Advertência registrada com sucesso.");
      }

      dismissToast(toastId);
      queryClient.invalidateQueries({ queryKey: ["userDetails", userId] });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Não foi possível registrar a advertência.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Advertência</DialogTitle>
          <DialogDescription>
            Descreva a violação cometida pelo usuário. Isso ficará registrado no histórico dele.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Advertência</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Publicou anúncio com conteúdo proibido, tentou aplicar golpe, etc."
              {...form.register("reason")}
              rows={4}
            />
            {form.formState.errors.reason && (
              <p className="text-sm text-red-500">{form.formState.errors.reason.message}</p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrar Advertência"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddViolationDialog;