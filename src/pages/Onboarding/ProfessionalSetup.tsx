import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, ArrowRight } from "lucide-react";
import { useState } from "react";

// Esquema de validação para o formulário de configuração profissional
const professionalSetupSchema = z.object({
  storeType: z.string().min(1, "Tipo de serviço é obrigatório."),
  address: z.string().min(10, "Endereço é obrigatório e deve ter pelo menos 10 caracteres."),
  operatingHours: z.string().optional(), // Pode ser mais complexo, por enquanto é texto
  serviceTags: z.string().optional(), // String separada por vírgulas, será convertida para array
  isOpen: z.boolean().default(false),
});

type ProfessionalSetupFormData = z.infer<typeof professionalSetupSchema>;

const ProfessionalSetupPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<ProfessionalSetupFormData>({
    resolver: zodResolver(professionalSetupSchema),
    defaultValues: {
      storeType: "",
      address: "",
      operatingHours: "",
      serviceTags: "",
      isOpen: false,
    },
  });

  const onSubmit = async (data: ProfessionalSetupFormData) => {
    if (!user) {
      showError("Você precisa estar logado para configurar seu perfil profissional.");
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);

    const serviceTagsArray = data.serviceTags ? data.serviceTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    const { error } = await supabase
      .from('profiles')
      .update({
        store_type: data.storeType,
        address: data.address,
        operating_hours: data.operatingHours,
        service_tags: serviceTagsArray,
        is_open: data.isOpen,
        account_type: 'service_provider', // Garante que o tipo de conta seja definido
      })
      .eq('id', user.id);

    if (error) {
      showError(`Erro ao salvar perfil: ${error.message}`);
    } else {
      showSuccess("Perfil profissional configurado com sucesso!");
      navigate('/profile'); // Redireciona para o perfil do usuário
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Configure Seu Perfil Profissional</CardTitle>
          <p className="text-muted-foreground text-sm">
            Adicione as informações essenciais para sua vitrine de serviços.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="storeType">Tipo de Serviço/Loja</Label>
              <Controller
                name="storeType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="autonomo">Autônomo</SelectItem>
                      <SelectItem value="empresa">Empresa</SelectItem>
                      <SelectItem value="online">Serviço Online</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.storeType && <p className="text-sm text-destructive mt-1">{errors.storeType.message}</p>}
            </div>

            <div>
              <Label htmlFor="address">Endereço de Atendimento</Label>
              <Textarea
                id="address"
                placeholder="Ex: Rua Exemplo, 123, Bairro, Cidade - Estado"
                {...register("address")}
              />
              {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
            </div>

            <div>
              <Label htmlFor="operatingHours">Horário de Funcionamento (Opcional)</Label>
              <Input
                id="operatingHours"
                placeholder="Ex: Seg-Sex, 9h-18h"
                {...register("operatingHours")}
              />
            </div>

            <div>
              <Label htmlFor="serviceTags">Tags de Serviço (Opcional)</Label>
              <Input
                id="serviceTags"
                placeholder="Ex: encanador, eletricista, diarista (separar por vírgulas)"
                {...register("serviceTags")}
              />
              <p className="text-xs text-muted-foreground mt-1">Separe as tags por vírgulas.</p>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="isOpen"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="isOpen"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="isOpen">Estou disponível para novos serviços</Label>
            </div>

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 h-12 text-lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  Salvar Configurações
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfessionalSetupPage;