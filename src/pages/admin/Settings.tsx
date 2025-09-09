import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";
import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type FormValues = {
  settings: {
    key: string;
    value: string;
  }[];
};

const fetchSiteSettings = async () => {
  const { data, error } = await supabase.from("site_settings").select("*").order('key');
  if (error) throw new Error(error.message);
  return data;
};

const updateSiteSettings = async (settings: FormValues['settings']) => {
  const updatePromises = settings.map(setting =>
    supabase
      .from("site_settings")
      .update({ value: setting.value })
      .eq("key", setting.key)
  );
  const results = await Promise.all(updatePromises);
  const firstError = results.find(result => result.error);
  if (firstError) throw new Error(firstError.error!.message);
};

const AdminSettingsPage = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: fetchSiteSettings,
  });
  const { register, handleSubmit, reset, control, formState: { isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (settings) reset({ settings });
  }, [settings, reset]);

  const mutation = useMutation({
    mutationFn: updateSiteSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      queryClient.invalidateQueries({ queryKey: ["siteSettingsGate"] }); // Invalidate gate query
      showSuccess("Configurações salvas com sucesso!");
    },
    onError: (err: any) => showError(err.message),
  });

  const onSubmit = (data: FormValues) => mutation.mutate(data.settings);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error) return <p className="text-destructive">Falha ao carregar as configurações.</p>;

  return (
    <Card>
      <CardHeader><CardTitle>Configurações do Site</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {settings?.map((setting, index) => {
            const keyInput = <input type="hidden" {...register(`settings.${index}.key`)} value={setting.key} />;
            
            if (setting.key === 'maintenance_mode') {
              return (
                <div key={setting.key}>
                  <Card className="p-4 flex items-center justify-between">
                    <div>
                      <Label htmlFor={setting.key} className="text-base">{setting.description}</Label>
                      <p className="text-sm text-muted-foreground">Quando ativado, apenas admins poderão acessar o site.</p>
                    </div>
                    <Controller
                      name={`settings.${index}.value`}
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id={setting.key}
                          checked={field.value === 'true'}
                          onCheckedChange={(checked) => field.onChange(checked ? 'true' : 'false')}
                        />
                      )}
                    />
                  </Card>
                  {keyInput}
                </div>
              );
            }

            if (setting.key === 'maintenance_message') {
              return (
                <div key={setting.key}>
                  <Label htmlFor={setting.key}>{setting.description}</Label>
                  <Textarea id={setting.key} {...register(`settings.${index}.value`)} className="mt-1" />
                  {keyInput}
                </div>
              );
            }

            return (
              <div key={setting.key}>
                <Label htmlFor={setting.key}>{setting.description || setting.key}</Label>
                <Input id={setting.key} {...register(`settings.${index}.value`)} className="mt-1" />
                {keyInput}
              </div>
            );
          })}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminSettingsPage;