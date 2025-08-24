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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { getOptimizedImageUrl, getRelativePathFromUrlOrPath, safeFormatDate } from "@/lib/utils";
import usePageMetadata from "@/hooks/usePageMetadata";
import { Database } from "@/types/supabase";
import { Profile as ProfileType } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton"; // Importação adicionada

const profileFormSchema = z.object({
  full_name: z.string().min(3, "O nome completo deve ter pelo menos 3 caracteres."),
  username: z.string()
    .min(3, "O nome de usuário deve ter de 3 a 20 caracteres.")
    .max(20, "O nome de usuário deve ter de 3 a 20 caracteres.")
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e o caractere '_'.")
    .optional()
    .or(z.literal('')),
  phone: z.string().optional().nullable(),
  avatar: z.instanceof(FileList).optional(),
  service_tags: z.string().optional().nullable(),
  account_type: z.enum(["fisica", "juridica"]),
  document_number: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
});

const fetchProfileDataForEdit = async (userId: string): Promise<ProfileType> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("Erro ao buscar perfil para edição:", error);
    throw new Error(error.message);
  }
  return data;
};

const EditProfilePage = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: profile, isLoading } = useQuery<ProfileType>({
    queryKey: ["editProfilePageData", session?.user?.id],
    queryFn: () => fetchProfileDataForEdit(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: "",
      username: "",
      phone: "",
      service_tags: "",
      account_type: 'fisica',
      document_number: "",
      date_of_birth: "",
    },
  });

  useEffect(() => {
    if (profile && session?.user) {
      profileForm.reset({
        full_name: profile.full_name || session.user.user_metadata?.full_name || "",
        username: profile.username || "",
        phone: profile.phone || "",
        service_tags: profile.service_tags?.join(', ') || "",
        account_type: profile.account_type === 'fisica' || profile.account_type === 'juridica' ? profile.account_type : 'fisica', 
        document_number: profile.document_number || "",
        date_of_birth: profile.date_of_birth ? safeFormatDate(profile.date_of_birth, 'dd/MM/yyyy') : "",
      });
    }
  }, [profile, session?.user, profileForm]);

  async function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    if (!session?.user) return;
    setIsSubmitting(true);
    const toastId = showLoading("Atualizando perfil...");
    try {
      let avatarPath = profile?.avatar_url ? getRelativePathFromUrlOrPath(profile.avatar_url, 'avatars') : null;
      const avatarFile = values.avatar?.[0];
      if (avatarFile) {
        const fileName = `${session.user.id}/avatar-${Date.now()}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, avatarFile, { upsert: true });
        if (uploadError) throw new Error(uploadError.message);
        avatarPath = fileName;
      }

      const serviceTagsArray = values.service_tags?.split(',').map(tag => tag.trim()).filter(Boolean) || null;
      const accountTypeToSave: Database['public']['Tables']['profiles']['Update']['account_type'] = values.account_type;

      const { error: updateError } = await supabase.from("profiles").upsert({
        id: session.user.id,
        full_name: values.full_name,
        username: values.username || null,
        phone: values.phone,
        avatar_url: avatarPath,
        service_tags: serviceTagsArray,
        account_type: accountTypeToSave,
      }).select();

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error("Este nome de usuário já está em uso. Tente outro.");
        }
        throw updateError;
      }

      queryClient.invalidateQueries({ queryKey: ["profileMenuPageData", session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ["headerProfile", session?.user?.id] });
      dismissToast(toastId);
      showSuccess("Perfil atualizado com sucesso!");
      navigate("/perfil"); // Volta para o menu do perfil
    } catch (error) {
      dismissToast(toastId);
      showError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  usePageMetadata({
    title: "Editar Perfil - Trokazz",
    description: "Atualize suas informações pessoais e foto de perfil no Trokazz.",
    keywords: "editar perfil, informações pessoais, foto de perfil, trokazz",
    ogImage: profile?.avatar_url ? getOptimizedImageUrl(profile.avatar_url, { width: 200, height: 200 }, 'avatars') : `${window.location.origin}/logo.png`,
    ogUrl: window.location.href,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <CardTitle>Editar Perfil</CardTitle>
          <CardDescription>Atualize suas informações e foto de perfil.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8 pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={getOptimizedImageUrl(profile?.avatar_url, { width: 160, height: 160 }, 'avatars')} />
                <AvatarFallback>{profile?.full_name?.[0] || session?.user.email?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <FormField
                control={profileForm.control}
                name="avatar"
                render={() => (
                  <FormItem className="flex-1">
                    <FormLabel>Alterar foto</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" {...profileForm.register("avatar")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-medium">Dados da Conta (Não Editáveis)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField control={profileForm.control} name="account_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Conta</FormLabel>
                    <FormControl>
                      <Input {...field} disabled value={field.value === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={profileForm.control} name="document_number" render={({ field }) => (
                  <FormItem><FormLabel>{profile?.account_type === 'juridica' ? 'CNPJ' : 'CPF'}</FormLabel><FormControl><Input {...field} disabled value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={profileForm.control} name="date_of_birth" render={({ field }) => (
                <FormItem><FormLabel>Data de Nascimento</FormLabel><FormControl><Input {...field} disabled value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações Editáveis</h3>
              <FormField
                control={profileForm.control}
                name="full_name"
                render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Usuário (URL do seu perfil)</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-muted-foreground text-sm pointer-events-none">trokazz.com/loja/</span>
                            <Input placeholder="seu_usuario" className="pl-[155px]" {...field} value={field.value || ''} />
                          </div>
                        </FormControl>
                            <FormDescription>
                              Este será o endereço público do seu perfil. Use apenas letras minúsculas, números e _.
                            </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone (WhatsApp)</FormLabel>
                        <FormControl><Input placeholder="(00) 00000-0000" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="service_tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags de Serviço</FormLabel>
                        <FormControl><Input placeholder="Ex: montador_moveis, eletricista, frete" {...field} value={field.value || ''} /></FormControl>
                        <FormDescription>
                          Se você é um prestador de serviço, adicione suas especialidades aqui, separadas por vírgula. Isso ajudará os clientes a te encontrarem.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
  );
};

export default EditProfilePage;