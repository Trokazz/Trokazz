import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useState } from "react";
import usePageMetadata from "@/hooks/usePageMetadata";

const contactSchema = z.object({
  subject: z.string().min(5, "O assunto deve ter pelo menos 5 caracteres."),
  message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres."),
  type: z.enum(["question", "bug", "suggestion", "other"], {
    required_error: "Por favor, selecione um tipo de contato.",
  }),
});

const Contact = () => {
  const { user } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  usePageMetadata({
    title: "Contato e Suporte - Trokazz",
    description: "Envie suas dúvidas, sugestões ou reporte problemas para a equipe do Trokazz. Estamos aqui para ajudar!",
    keywords: "contato, suporte, ajuda, feedback, bug, trokazz",
    ogUrl: window.location.href,
  });

  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: "",
      message: "",
      type: "question",
    },
  });

  const onSubmit = async (values: z.infer<typeof contactSchema>) => {
    if (!user) {
      showError("Você precisa estar logado para enviar uma mensagem de suporte.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading("Enviando sua mensagem...");

    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: values.subject,
        message: values.message,
        type: values.type,
      });

      if (error) throw error;

      // Fetch user's full_name for the notification message
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const userName = profileData?.full_name || user.email || 'Um usuário';

      // Invoca a Edge Function para criar a notificação de admin
      const { error: adminNotifInvokeError } = await supabase.functions.invoke('create-admin-notification', {
        body: {
          message: `Novo ticket de suporte de ${userName}: "${values.subject}".`,
          link: `/admin/support-tickets`, // Link to the main support tickets page
          type: 'new_support_ticket',
        },
      });
      if (adminNotifInvokeError) {
        console.error('Error invoking Edge Function for admin notification:', adminNotifInvokeError);
        // Don't throw, as this shouldn't block ticket creation
      }

      dismissToast(toastId);
      showSuccess("Sua mensagem foi enviada com sucesso! Em breve entraremos em contato.");
      setIsSubmitted(true);
      form.reset();
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Não foi possível enviar sua mensagem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl">Entre em Contato</CardTitle>
        <CardDescription>
          Tem alguma dúvida, sugestão ou problema? Fale conosco.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSubmitted ? (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold">Mensagem Enviada!</h3>
            <p className="text-muted-foreground mt-2">Agradecemos seu contato. Nossa equipe responderá o mais breve possível.</p>
            <Button onClick={() => setIsSubmitted(false)} className="mt-6">Enviar outra mensagem</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Contato</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de contato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="question">Dúvida</SelectItem>
                        <SelectItem value="bug">Reportar um Problema/Bug</SelectItem>
                        <SelectItem value="suggestion">Sugestão</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assunto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Problema com login, Sugestão de nova categoria" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sua Mensagem</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva sua dúvida ou problema em detalhes..." className="resize-y min-h-[120px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting || !user}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  "Enviar Mensagem"
                )}
              </Button>
              {!user && (
                <p className="text-center text-sm text-muted-foreground">
                  Você precisa estar logado para enviar uma mensagem.
                </p>
              )}
            </form>
          </Form>
        )}
        <div className="flex items-center gap-4 pt-4 border-t">
          <Mail className="h-6 w-6 text-primary" />
          <div>
            <h3 className="font-semibold">E-mail Direto</h3>
            <a href="mailto:contato@trokazz.com.br" className="text-muted-foreground hover:text-primary">
              contato@trokazz.com.br
            </a>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Para questões urgentes ou se preferir, você pode nos contatar diretamente por e-mail.
        </p>
      </CardContent>
    </Card>
  );
};

export default Contact;