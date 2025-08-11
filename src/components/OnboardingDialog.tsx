import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { PartyPopper } from "lucide-react";

const onboardingSchema = z.object({
  full_name: z.string().min(3, "Seu nome completo é necessário."),
  username: z.string()
    .min(3, "O nome de usuário deve ter de 3 a 20 caracteres.")
    .max(20, "O nome de usuário deve ter de 3 a 20 caracteres.")
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e '_'.")
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  avatar: z.instanceof(FileList).optional(),
});

interface OnboardingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const OnboardingDialog = ({ isOpen, onOpenChange, onSuccess }: OnboardingDialogProps) => {
  const { user } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      full_name: "",
      username: "",
      phone: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof onboardingSchema>) => {
    if (!user) return;
    setIsSubmitting(true);
    const toastId = showLoading("Salvando suas informações...");

    try {
      const updatePayload: {
        full_name: string;
        username: string | null;
        phone?: string;
        avatar_url?: string;
      } = {
        full_name: values.full_name,
        username: values.username || null,
        phone: values.phone,
      };

      const avatarFile = values.avatar?.[0];
      if (avatarFile) {
        const fileName = `${user.id}/avatar-${Date.now()}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, avatarFile, { upsert: true });
        if (uploadError) throw new Error(uploadError.message);
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
        updatePayload.avatar_url = publicUrl;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id);

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error("Este nome de usuário já está em uso. Tente outro.");
        }
        throw updateError;
      }

      dismissToast(toastId);
      showSuccess("Perfil completo! Bem-vindo(a) ao Trokazz!");
      onSuccess();
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <PartyPopper className="mx-auto h-12 w-12 text-primary mb-2" />
          <DialogTitle className="text-2xl">Bem-vindo(a) ao Trokazz!</DialogTitle>
          <DialogDescription>
            Vamos começar configurando seu perfil. Isso ajuda a criar confiança na comunidade.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="avatar"
              render={() => (
                <FormItem>
                  <FormLabel>Foto de Perfil (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" {...form.register("avatar")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu Nome Completo</FormLabel>
                  <FormControl><Input placeholder="Ex: João da Silva" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome de Usuário (Opcional)</FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-muted-foreground text-sm">trokazz.com/loja/</span>
                      <Input placeholder="joao_silva" className="pl-[150px]" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Este será o endereço da sua loja pública.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone (WhatsApp, Opcional)</FormLabel>
                  <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Salvando..." : "Concluir e Começar a Usar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};