"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Mail, LifeBuoy, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import MobilePageHeader from '@/components/MobilePageHeader';

const supportTicketSchema = z.object({
  type: z.enum(['question', 'bug', 'suggestion', 'other'], { required_error: "Por favor, selecione um tipo de contato." }),
  subject: z.string().min(5, "O assunto deve ter pelo menos 5 caracteres."),
  message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres."),
});

type SupportTicketFormData = z.infer<typeof supportTicketSchema>;

const SupportTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<SupportTicketFormData>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      type: 'question',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (data: SupportTicketFormData) => {
    if (!user) {
      showError("Você precisa estar logado para enviar uma mensagem de suporte.");
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        subject: data.subject,
        message: data.message,
        type: data.type,
        status: 'new', // Default status for new tickets
      });

      if (error) {
        throw error;
      }

      showSuccess("Sua mensagem de suporte foi enviada com sucesso! Entraremos em contato em breve.");
      reset(); // Clear the form
      navigate('/profile'); // Redirect to profile page
    } catch (error: any) {
      showError(`Erro ao enviar mensagem: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobilePageHeader title="Entre em Contato" />

      <main className="flex-1 flex flex-col items-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Entre em Contato</CardTitle>
            <p className="text-muted-foreground text-sm">
              Tem alguma dúvida, sugestão ou problema? Fale conosco.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="type">Tipo de Contato</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="question">Dúvida</SelectItem>
                        <SelectItem value="bug">Problema/Bug</SelectItem>
                        <SelectItem value="suggestion">Sugestão</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
              </div>

              <div>
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  placeholder="Ex: Problema com login, Sugestão de nova categoria"
                  {...register("subject")}
                  disabled={isSubmitting}
                />
                {errors.subject && <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>}
              </div>

              <div>
                <Label htmlFor="message">Sua Mensagem</Label>
                <Textarea
                  id="message"
                  placeholder="Descreva sua dúvida ou problema em detalhes..."
                  {...register("message")}
                  rows={6}
                  disabled={isSubmitting}
                />
                {errors.message && <p className="text-sm text-destructive mt-1">{errors.message.message}</p>}
              </div>

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 h-12 text-lg" disabled={isSubmitting || !user}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <LifeBuoy className="mr-2 h-5 w-5" />
                    Enviar Mensagem
                  </>
                )}
              </Button>
              {!user && (
                <p className="text-sm text-muted-foreground text-center">
                  Você precisa estar logado para enviar uma mensagem.
                </p>
              )}
            </form>

            <div className="border-t pt-6 mt-6 space-y-4">
              <h3 className="font-semibold text-lg">E-mail Direto</h3>
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-primary" />
                <a href="mailto:contato@trokazz.com.br" className="text-primary hover:underline">
                  contato@trokazz.az
                </a>
              </div>
              <p className="text-sm text-muted-foreground">
                Para questões urgentes ou se preferir, você pode nos contatar diretamente por e-mail.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SupportTicketPage;