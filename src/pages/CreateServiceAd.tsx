import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useState } from "react";

const serviceAdSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  pricing_type: z.string({ required_error: "Selecione um tipo de preço." }),
  price: z.coerce.number().positive("O preço deve ser positivo.").optional(),
  image: z.instanceof(FileList).optional(),
}).refine(data => data.pricing_type === 'on_quote' || (data.price && data.price > 0), {
  message: "O preço é obrigatório para este tipo de precificação.",
  path: ["price"],
});

const CreateServiceAd = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof serviceAdSchema>>({
    resolver: zodResolver(serviceAdSchema),
  });

  const pricingType = form.watch("pricing_type");

  async function onSubmit(values: z.infer<typeof serviceAdSchema>) {
    if (!user) {
      showError("Você precisa estar logado para oferecer um serviço.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading("Publicando seu serviço...");

    try {
      let imageUrl: string | undefined;
      const imageFile = values.image?.[0];
      if (imageFile) {
        const fileName = `${user.id}/${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from("service_images").upload(fileName, imageFile);
        if (uploadError) throw new Error(`Erro no upload da imagem: ${uploadError.message}`);
        const { data: { publicUrl } } = supabase.storage.from("service_images").getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error: insertError } = await supabase.from("services").insert({
        user_id: user.id,
        title: values.title,
        description: values.description,
        category_slug: 'servicos',
        pricing_type: values.pricing_type,
        price: values.pricing_type !== 'on_quote' ? values.price : null,
        image_url: imageUrl,
      });

      if (insertError) throw new Error(`Erro ao criar o serviço: ${insertError.message}`);

      dismissToast(toastId);
      showSuccess("Serviço publicado com sucesso!");
      navigate(`/servicos`);
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Oferecer um Serviço</CardTitle>
        <CardDescription>Descreva o serviço que você oferece para que novos clientes possam te encontrar.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título do Serviço</FormLabel>
                <FormControl><Input placeholder="Ex: Eletricista Residencial" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição Detalhada</FormLabel>
                <FormControl><Textarea placeholder="Descreva suas habilidades, experiência e o que está incluso no serviço." className="resize-y min-h-[100px]" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="pricing_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Preço</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="fixed">Preço Fixo</SelectItem>
                      <SelectItem value="hourly">Por Hora</SelectItem>
                      <SelectItem value="on_quote">Sob Orçamento</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {pricingType && pricingType !== 'on_quote' && (
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder={pricingType === 'hourly' ? 'Valor por hora' : 'Valor total'} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>
            <FormField control={form.control} name="image" render={() => (
              <FormItem>
                <FormLabel>Imagem de Destaque (Opcional)</FormLabel>
                <FormControl><Input type="file" accept="image/*" {...form.register("image")} /></FormControl>
                <FormDescription>Uma boa imagem ajuda a atrair mais clientes.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Publicando..." : "Publicar Serviço"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateServiceAd;