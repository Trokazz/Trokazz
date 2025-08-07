import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { useQuery } from "@tanstack/react-query";

const wantedAdSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  budget: z.coerce.number().positive("O orçamento deve ser um valor positivo.").optional(),
  category_slug: z.string({ required_error: "Por favor, selecione uma categoria." }),
});

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("name, slug").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const CreateWantedAd = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const form = useForm<z.infer<typeof wantedAdSchema>>({
    resolver: zodResolver(wantedAdSchema),
  });

  async function onSubmit(values: z.infer<typeof wantedAdSchema>) {
    if (!user) {
      showError("Você precisa estar logado para criar um anúncio de procura.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading("Publicando sua procura...");

    try {
      const { error } = await supabase.from("wanted_ads").insert({
        user_id: user.id,
        title: values.title,
        description: values.description,
        budget: values.budget,
        category_slug: values.category_slug,
      });

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Seu anúncio de procura foi publicado!");
      navigate("/procurados");
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Ocorreu um erro.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>O que você está procurando?</CardTitle>
        <CardDescription>
          Descreva o item que você deseja e deixe que os vendedores encontrem você.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Procura</FormLabel>
                  <FormControl><Input placeholder="Ex: Procuro monitor gamer 27 polegadas" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione a categoria do item" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map(cat => (
                        <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada</FormLabel>
                  <FormControl><Textarea placeholder="Seja específico sobre o que você precisa: marca, modelo, condição, etc." className="resize-y min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orçamento Máximo (R$, Opcional)</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="Ex: 800.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Publicando..." : "Publicar Anúncio de Procura"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateWantedAd;