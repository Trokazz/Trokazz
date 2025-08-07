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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";

const settingsSchema = z.object({
  maintenance_mode: z.boolean().default(false),
  welcome_message: z.string().optional(),
  boost_price: z.coerce.number().min(0, "O preço deve ser positivo.").default(10),
  boost_duration_days: z.coerce.number().int().min(1, "A duração deve ser de pelo menos 1 dia.").default(7),
});

type SettingsData = z.infer<typeof settingsSchema>;

const fetchSettings = async (): Promise<SettingsData> => {
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) throw new Error(error.message);

  const settings = data.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as { [key: string]: any });

  return {
    maintenance_mode: settings.maintenance_mode === 'true',
    welcome_message: settings.welcome_message || "",
    boost_price: settings.boost_price ? parseFloat(settings.boost_price) : 10,
    boost_duration_days: settings.boost_duration_days ? parseInt(settings.boost_duration_days, 10) : 7,
  };
};

const SiteSettings = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: fetchSettings,
  });

  const form = useForm<SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      maintenance_mode: false,
      welcome_message: "",
      boost_price: 10,
      boost_duration_days: 7,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const onSubmit = async (values: SettingsData) => {
    const toastId = showLoading("Salvando configurações...");
    try {
      const settingsToSave = Object.entries(values).map(([key, value]) => ({
        key,
        value: String(value),
      }));

      const { error } = await supabase.from("site_settings").upsert(settingsToSave, { onConflict: 'key' });
      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Configurações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
        <CardContent className="space-y-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Site</CardTitle>
        <CardDescription>Gerencie as configurações globais do seu site.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="maintenance_mode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Modo Manutenção</FormLabel>
                    <FormDescription>
                      Ative para bloquear o acesso ao site para usuários não-administradores.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="welcome_message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem de Boas-Vindas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Deixe em branco para não exibir nenhuma mensagem." {...field} />
                  </FormControl>
                  <FormDescription>
                    Esta mensagem aparecerá em um banner no topo da página inicial.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="boost_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo do Impulsionamento (em Créditos)</FormLabel>
                    <FormControl><Input type="number" step="1" {...field} /></FormControl>
                    <FormDescription>Defina o custo em créditos para impulsionar um anúncio.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="boost_duration_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração do Impulsionamento (dias)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormDescription>Por quantos dias o anúncio ficará em destaque.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default SiteSettings;