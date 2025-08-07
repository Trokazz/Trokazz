import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Label } from "@/components/ui/label";

const pageSchema = z.object({
  content: z.string().min(1, "O conteúdo não pode estar vazio."),
});

const fetchPageContent = async (slug: string) => {
  const { data, error } = await supabase.from("pages").select("content").eq("slug", slug).single();
  if (error) throw error;
  return data;
};

const ManagePages = () => {
  const [selectedPage, setSelectedPage] = useState("privacy-policy");
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof pageSchema>>({
    resolver: zodResolver(pageSchema),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pageContent", selectedPage],
    queryFn: () => fetchPageContent(selectedPage),
    enabled: !!selectedPage,
  });

  useEffect(() => {
    if (data) {
      form.reset({ content: data.content || "" });
    }
  }, [data, form]);

  const onSubmit = async (values: z.infer<typeof pageSchema>) => {
    const toastId = showLoading("Salvando conteúdo...");
    try {
      const { error } = await supabase
        .from("pages")
        .update({ content: values.content })
        .eq("slug", selectedPage);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess("Página atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["page", selectedPage] });
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Páginas</CardTitle>
        <CardDescription>Edite o conteúdo das páginas de política e termos do seu site.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Selecione a página para editar</Label>
          <Select onValueChange={setSelectedPage} value={selectedPage}>
            <SelectTrigger className="w-full md:w-1/3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="privacy-policy">Política de Privacidade</SelectItem>
              <SelectItem value="terms-of-service">Termos de Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <Skeleton className="h-64 w-full" />}
        {isError && <p className="text-destructive">Não foi possível carregar o conteúdo.</p>}
        {!isLoading && !isError && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo da Página</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={25} className="font-mono" />
                    </FormControl>
                    <FormDescription>
                      Você pode usar tags HTML básicas como &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;, e &lt;h2&gt; para formatação.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Salvando..." : "Salvar Conteúdo"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};

export default ManagePages;