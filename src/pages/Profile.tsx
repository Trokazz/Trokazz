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
import { Link, useSearchParams } from "react-router-dom";
import { Trash2, Eye, CheckSquare, Pencil, PauseCircle, PlayCircle, Star, Zap, Gem, ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FavoriteAdsList from "@/components/FavoriteAdsList";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SellerAnalytics from "@/components/SellerAnalytics";
import OffersTab from "@/components/OffersTab";
import { isValid } from "date-fns";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import VerificationTab from "@/components/VerificationTab";
import { getOptimizedImageUrl, safeFormatDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfilePageData, Advertisement, ReviewWithReviewer } from "@/types/database";

// Adicionado para depuração: Verifica se o arquivo está sendo processado
console.log("Profile.tsx file is being processed.");

const profileFormSchema = z.object({
  full_name: z.string().min(3, "O nome completo deve ter pelo menos 3 caracteres."),
  username: z.string()
    .min(3, "O nome de usuário deve ter de 3 a 20 caracteres.")
    .max(20, "O nome de usuário deve ter de 3 a 20 caracteres.")
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e o caractere '_'.")
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  avatar: z.instanceof(FileList).optional(),
  service_tags: z.string().optional(),
  account_type: z.string().optional(),
  document_number: z.string().optional(),
  date_of_birth: z.string().optional(),
});

type UserAd = Advertisement & { status: string; view_count: number; last_renewed_at: string | null; boosted_until: string | null };

const fetchProfilePageData = async (userId: string): Promise<ProfilePageData> => {
  const { data, error } = await supabase.rpc('get_profile_page_data', { p_user_id: userId });
  if (error) {
    console.error("Erro ao buscar dados do perfil:", error);
    throw new Error(error.message);
  }
  // Se a RPC retornar um objeto, mas o 'profile' dentro dele for nulo, tratamos aqui.
  // A RPC 'get_profile_page_data' retorna um JSON, e o campo 'profile' dentro desse JSON
  // será nulo se não houver um perfil correspondente na tabela 'public.profiles'.
  if (!data || !data.profile) {
    console.warn("Dados do perfil não encontrados para o usuário:", userId);
    return {
      profile: null,
      ads: [],
      reviews: [],
      credits: { balance: 0 },
      settings: {},
    } as ProfilePageData;
  }

  // Garante que as propriedades são arrays ou objetos vazios se forem null
  data.ads = data.ads || [];
  data.reviews = data.reviews || [];
  data.credits = data.credits || { balance: 0 };
  data.settings = data.settings || {};
  
  return data as ProfilePageData;
};

const Profile = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const activeTab = searchParams.get("tab") || "my-ads";

  const { data, isLoading, refetch } = useQuery<ProfilePageData>({ // Explicitamente tipando 'data'
    queryKey: ["profilePageData", session?.user?.id],
    queryFn: () => fetchProfilePageData(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  // Adicionado para depuração: Verifica o estado de carregamento e os dados brutos
  console.log("Profile component render - isLoading:", isLoading);
  console.log("Profile component render - raw data:", data);

  // Desestruturação única e segura dos dados do perfil
  const profile = data?.profile;
  const userAds = data?.ads || [];
  const reviews = data?.reviews || [];
  const credits = data?.credits;
  const settings = data?.settings;

  // Adicionado para depuração: Verifica o objeto de perfil desestruturado
  console.log("Profile component render - destructured profile:", profile);

  const handleTabChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", value);
    setSearchParams(newSearchParams, { replace: true });
  };

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    // Garante que os valores padrão sejam sempre strings, mesmo que profile seja null inicialmente
    defaultValues: {
      full_name: profile?.full_name || session?.user?.user_metadata?.full_name || "",
      username: profile?.username || "",
      phone: profile?.phone || "",
      service_tags: profile?.service_tags?.join(', ') || "",
      // Corrigido: O resultado do ternário já é uma string, não precisa de || ""
      account_type: profile?.account_type === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica',
      document_number: profile?.document_number || "",
      date_of_birth: profile?.date_of_birth ? safeFormatDate(profile.date_of_birth, 'dd/MM/yyyy') : "",
    },
  });

  useEffect(() => {
    if (profile && session?.user) {
      profileForm.reset({
        full_name: profile.full_name || session.user.user_metadata?.full_name || "",
        username: profile.username || "",
        phone: profile.phone || "",
        service_tags: profile.service_tags?.join(', ') || "",
        account_type: profile.account_type === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica',
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
      let avatarUrl = profile?.avatar_url;
      const avatarFile = values.avatar?.[0];
      if (avatarFile) {
        const fileName = `${session.user.id}/avatar-${Date.now()}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, avatarFile, { upsert: true });
        if (uploadError) throw new Error(uploadError.message);
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
        avatarUrl = publicUrl;
      }

      const serviceTagsArray = values.service_tags?.split(',').map(tag => tag.trim()).filter(Boolean) || null;

      const { error: updateError } = await supabase.from("profiles").upsert({
        id: session.user.id,
        full_name: values.full_name,
        username: values.username || null,
        phone: values.phone,
        avatar_url: avatarUrl,
        service_tags: serviceTagsArray,
      }).select();

      if (updateError) {
        // A função showError aprimorada agora lida com detalhes de erro do Supabase
        // Mantemos esta verificação específica para uma mensagem mais amigável para username duplicado
        if (updateError.code === '23505') {
          throw new Error("Este nome de usuário já está em uso. Tente outro.");
        }
        throw updateError; // Lança o erro para ser capturado pelo catch e exibido por showError
      }

      await refetch();
      queryClient.invalidateQueries({ queryKey: ["headerProfile", session?.user?.id] });
      dismissToast(toastId);
      showSuccess("Perfil atualizado com sucesso!");
    } catch (error) {
      dismissToast(toastId);
      showError(error); // Usando a função showError aprimorada
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteAd = async (adId: string, imageUrls: string[]) => {
    const toastId = showLoading("Excluindo anúncio...");
    try {
      if (imageUrls && imageUrls.length > 0) {
        const imagePaths = imageUrls.map(url => url.split("/advertisements/")[1]).filter(Boolean);
        if (imagePaths.length > 0) await supabase.storage.from("advertisements").remove(imagePaths);
      }
      const { error } = await supabase.from("advertisements").delete().eq("id", adId);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess("Anúncio excluído com sucesso!");
      refetch();
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao excluir anúncio.");
    }
  };

  const handleStatusUpdate = async (adId: string, status: 'sold' | 'paused' | 'approved') => {
    const toastId = showLoading("Atualizando anúncio...");
    try {
      const { error } = await supabase.from("advertisements").update({ status }).eq("id", adId);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess("Anúncio atualizado!");
      refetch();
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao atualizar anúncio.");
    }
  };

  const handleBoostAd = async (adId: string) => {
    const toastId = showLoading("Impulsionando anúncio...");
    try {
      const { error } = await supabase.rpc('spend_credits_for_boost', { ad_id_param: adId });
      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Anúncio impulsionado com sucesso!`);
      refetch();
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao impulsionar anúncio.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="default" className="bg-green-500">Aprovado</Badge>;
      case 'pending_approval': return <Badge variant="secondary">Pendente</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejeitado</Badge>;
      case 'sold': return <Badge variant="outline" className="border-purple-500 text-purple-500">Vendido</Badge>;
      case 'paused': return <Badge variant="outline" className="border-gray-500 text-gray-500">Pausado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    console.log("Profile component rendering skeleton.");
    return (
      <div className="space-y-8">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Se o perfil não for encontrado (profile é null)
  if (!profile) {
    console.error("Profile data is null. Rendering 'Complete seu Perfil' card.");
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Complete seu Perfil</CardTitle>
          <CardDescription>
            Parece que seu perfil ainda não está completo. Por favor, preencha suas informações para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8 pt-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={getOptimizedImageUrl(profile?.avatar_url, { width: 160, height: 160 })} />
                  <AvatarFallback>{session?.user.email?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <FormField
                  control={profileForm.control}
                  name="avatar"
                  render={() => (
                    <FormItem className="flex-1">
                      <FormLabel>Foto de Perfil</FormLabel>
                      <FormControl>
                        <Input type="file" accept="image/*" {...profileForm.register("avatar")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Campos de dados da conta desabilitados, mas preenchidos se existirem no perfil */}
              <div className="space-y-4 border-b pb-6">
                <h3 className="text-lg font-medium">Dados da Conta (Não Editáveis)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField control={profileForm.control} name="account_type" render={({ field }) => (
                    <FormItem><FormLabel>Tipo de Conta</FormLabel><FormControl><Input {...field} disabled value={field.value || ''} /></FormControl><FormMessage /></FormItem>
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
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  console.log("Profile component rendering main content.");

  return (
    <>
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {isMobile ? (
          <Select onValueChange={handleTabChange} value={activeTab}>
            <SelectTrigger className="w-full text-base py-6">
              <SelectValue placeholder="Selecione uma seção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="my-ads">Meus Anúncios</SelectItem>
              <SelectItem value="offers">Minhas Ofertas</SelectItem>
              <SelectItem value="analytics">Desempenho</SelectItem>
              <SelectItem value="favorites">Meus Favoritos</SelectItem>
              <SelectItem value="reviews">Minhas Avaliações</SelectItem>
              <SelectItem value="perfil">Perfil</SelectItem>
              <SelectItem value="verification">Verificação</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap border-b">
            <TabsList className="inline-flex h-auto bg-transparent p-0">
              <TabsTrigger value="my-ads" className="h-full rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Meus Anúncios</TabsTrigger>
              <TabsTrigger value="offers" className="h-full rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Minhas Ofertas</TabsTrigger>
              <TabsTrigger value="analytics" className="h-full rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Desempenho</TabsTrigger>
              <TabsTrigger value="favorites" className="h-full rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Meus Favoritos</TabsTrigger>
              <TabsTrigger value="reviews" className="h-full rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Minhas Avaliações</TabsTrigger>
              <TabsTrigger value="perfil" className="h-full rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Perfil</TabsTrigger>
              <TabsTrigger value="verification" className="h-full rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Verificação</div></TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
        
        <TabsContent value="my-ads">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <CardTitle>Meus Anúncios</CardTitle>
                  <CardDescription>Gerencie os anúncios que você publicou.</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <Gem className="h-5 w-5" />
                    <span>{credits?.balance || 0}</span>
                    <span className="text-sm font-medium text-muted-foreground">Créditos</span>
                  </div>
                  <Button onClick={() => setIsCreditsDialogOpen(true)}>Comprar Créditos</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userAds && userAds.length > 0 ? (
                  userAds.map((ad) => {
                    const now = new Date();
                    let isBoosted = false;
                    if (ad.boosted_until) {
                        const boostedUntilDate = new Date(ad.boosted_until);
                        if (isValid(boostedUntilDate)) {
                            isBoosted = boostedUntilDate > now;
                        }
                    }
                    
                    const boostCost = parseInt(settings?.boost_price || '25');
                    const userBalance = credits?.balance || 0;
                    const hasEnoughCredits = userBalance >= boostCost;

                    return (
                      <div key={ad.id} className="flex items-center justify-between p-2 border rounded-lg gap-2 flex-wrap">
                        <div className="flex items-center gap-4 flex-grow min-w-[250px]">
                          <Link to={`/anuncio/${ad.id}`} className="flex items-center gap-4">
                            <img src={getOptimizedImageUrl(ad.image_urls?.[0], { width: 150, height: 150 }) || '/placeholder.svg'} alt={ad.title} className="w-16 h-16 object-cover rounded-md" />
                            <div>
                              <p className="font-semibold">{ad.title}</p>
                              <p className="text-sm text-primary font-bold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ad.price)}</p>
                              <div className="flex items-center gap-4 mt-1 flex-wrap">
                                {getStatusBadge(ad.status)}
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Eye className="h-4 w-4" />
                                  <span>{ad.view_count}</span>
                                </div>
                                {isBoosted && <Badge className="bg-yellow-400 text-black hover:bg-yellow-500"><Zap className="h-3 w-3 mr-1" />Destaque</Badge>}
                              </div>
                            </div>
                          </Link>
                        </div>
                        <div className="flex flex-shrink-0 gap-1">
                          {ad.status !== 'rejected' && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="icon" disabled={isBoosted}>
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Impulsionar Anúncio</AlertDialogTitle>
                                    {hasEnoughCredits ? (
                                      <AlertDialogDescription>
                                        Seu anúncio "{ad.title}" será exibido com destaque por {settings?.boost_duration_days || 7} dias.
                                        Isso custará {boostCost} créditos. Você tem {userBalance} créditos.
                                      </AlertDialogDescription>
                                    ) : (
                                      <AlertDialogDescription>
                                        Você não tem créditos suficientes. Para impulsionar "{ad.title}" por {settings?.boost_duration_days || 7} dias, você precisa de {boostCost} créditos, mas possui apenas {userBalance}.
                                      </AlertDialogDescription>
                                    )}
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    {hasEnoughCredits ? (
                                      <AlertDialogAction onClick={() => handleBoostAd(ad.id)}>
                                        Confirmar Impulso
                                      </AlertDialogAction>
                                    ) : (
                                      <AlertDialogAction asChild>
                                        <Button onClick={() => setIsCreditsDialogOpen(true)}>
                                          Comprar Créditos
                                        </Button>
                                      </AlertDialogAction>
                                    )}
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link to={`/perfil/anuncio/${ad.id}/editar`}>
                                    <Button variant="outline" size="icon"><Pencil className="h-4 w-4" /></Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar anúncio</p></TooltipContent>
                              </Tooltip>
                              {ad.status === 'approved' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => handleStatusUpdate(ad.id, 'paused')}>
                                      <PauseCircle className="h-4 w-4 text-gray-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Pausar anúncio</p></TooltipContent>
                                </Tooltip>
                              )}
                              {ad.status === 'paused' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => handleStatusUpdate(ad.id, 'approved')}>
                                      <PlayCircle className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Reativar anúncio</p></TooltipContent>
                                </Tooltip>
                              )}
                              {ad.status !== 'sold' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => handleStatusUpdate(ad.id, 'sold')}>
                                      <CheckSquare className="h-4 w-4 text-purple-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Marcar como vendido</p></TooltipContent>
                                </Tooltip>
                              )}
                            </>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o seu anúncio.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAd(ad.id, ad.image_urls)}>
                                  Sim, excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-center py-4">Você ainda não publicou nenhum anúncio.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="offers">
          <OffersTab />
        </TabsContent>
        <TabsContent value="analytics">
          <SellerAnalytics />
        </TabsContent>
        <TabsContent value="favorites">
          <Card>
            <CardHeader>
              <CardTitle>Meus Favoritos</CardTitle>
              <CardDescription>Anúncios que você salvou para ver mais tarde.</CardDescription>
            </CardHeader>
            <CardContent>
              <FavoriteAdsList />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reviews">
            <Card>
                <CardHeader>
                    <CardTitle>Avaliações Recebidas</CardTitle>
                    <CardDescription>O que outros usuários dizem sobre você.</CardDescription>
                </CardHeader>
                <CardContent>
                    {reviews && reviews.length > 0 ? (
                        <div className="space-y-4">
                            {reviews.map((review: ReviewWithReviewer) => (
                                <div key={review.id} className="border-b pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                            ))}
                                        </div>
                                        <p className="font-bold">{review.reviewer?.full_name || 'Usuário'}</p>
                                    </div>
                                    <p className="text-muted-foreground mt-2">{review.comment}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">Você ainda não recebeu nenhuma avaliação.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="verification">
          <VerificationTab />
        </TabsContent>

        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize suas informações e foto de perfil.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8 pt-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={getOptimizedImageUrl(profile?.avatar_url, { width: 160, height: 160 })} />
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
                    <h3 className="text-lg font-medium">Dados da Conta</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={profileForm.control} name="account_type" render={({ field }) => (
                        <FormItem><FormLabel>Tipo de Conta</FormLabel><FormControl><Input {...field} disabled value={field.value || ''} /></FormControl><FormMessage /></FormItem>
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
                    {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    {/* O componente BuyCreditsDialog foi removido para resolver o erro de CSP. */}
    {/* <BuyCreditsDialog isOpen={isCreditsDialogOpen} onOpenChange={setIsCreditsDialogOpen} /> */}
    </>
  );
};

export default Profile;