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
import { Advertisement } from "@/components/AdCard";
import { Link, useSearchParams } from "react-router-dom";
import { Trash2, Eye, CheckSquare, Pencil, RefreshCw, PauseCircle, PlayCircle, Star, Zap, Gem, ShieldCheck } from "lucide-react";
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
import { BuyCreditsDialog } from "@/components/BuyCreditsDialog";
import VerificationTab from "@/components/VerificationTab";
import { getOptimizedImageUrl } from "@/lib/utils";

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
});

type UserAd = Advertisement & { status: string; view_count: number; last_renewed_at: string | null; boosted_until: string | null };

const fetchUserAds = async (userId: string) => {
  const { data, error } = await supabase
    .from("advertisements")
    .select("*, view_count, last_renewed_at, boosted_until")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as UserAd[];
};

const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const fetchReviews = async (sellerId: string) => {
    const { data: rawReviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    if (!rawReviews || rawReviews.length === 0) {
      return [];
    }

    const reviewerIds = [...new Set(rawReviews.map(r => r.reviewer_id))];
    const { data: reviewersData, error: reviewersError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", reviewerIds);

    if (reviewersError) {
      console.error("Failed to fetch reviewers", reviewersError);
      return rawReviews.map(r => ({ ...r, reviewer: null }));
    }

    return rawReviews.map(review => ({
      ...review,
      reviewer: reviewersData.find(p => p.id === review.reviewer_id) || null
    }));
}

const fetchSiteSettings = async () => {
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) throw new Error(error.message);
  return data.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as { [key: string]: any });
};

const fetchUserCredits = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return { balance: 0 };
    throw new Error(error.message);
  }
  return data || { balance: 0 };
};

const Profile = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
  
  const activeTab = searchParams.get("tab") || "my-ads";

  const { data: settings } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: fetchSiteSettings,
  });

  const { data: credits, isLoading: isLoadingCredits } = useQuery({
    queryKey: ["userCredits", session?.user?.id],
    queryFn: () => fetchUserCredits(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  const handleTabChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", value);
    setSearchParams(newSearchParams, { replace: true });
  };

  const { data: userAds, refetch: refetchAds, isLoading: isLoadingAds } = useQuery({
    queryKey: ["userAds", session?.user?.id],
    queryFn: () => fetchUserAds(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  const { data: profile, refetch: refetchProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["userProfile", session?.user?.id],
    queryFn: () => fetchUserProfile(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  const { data: reviews, isLoading: isLoadingReviews } = useQuery({
      queryKey: ['reviews', session?.user?.id],
      queryFn: () => fetchReviews(session!.user!.id),
      enabled: !!session?.user?.id,
  });

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { full_name: "", username: "", phone: "", service_tags: "" },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        full_name: profile.full_name || "",
        username: profile.username || "",
        phone: profile.phone || "",
        service_tags: profile.service_tags?.join(', ') || "",
      });
    }
  }, [profile, profileForm]);

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

      const { error: updateError } = await supabase.from("profiles").update({
        full_name: values.full_name,
        username: values.username || null,
        phone: values.phone,
        avatar_url: avatarUrl,
        service_tags: serviceTagsArray,
      }).eq("id", session.user.id);

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error("Este nome de usuário já está em uso. Tente outro.");
        }
        throw new Error(updateError.message);
      }

      await refetchProfile();
      queryClient.invalidateQueries({ queryKey: ["headerProfile", session?.user?.id] });
      dismissToast(toastId);
      showSuccess("Perfil atualizado com sucesso!");
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao atualizar perfil.");
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
      refetchAds();
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
      refetchAds();
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao atualizar anúncio.");
    }
  };

  const handleRenewAd = async (ad: UserAd) => {
    const toastId = showLoading("Renovando anúncio...");
    try {
      const { error } = await supabase.from("advertisements").update({ 
        created_at: new Date().toISOString(),
        last_renewed_at: new Date().toISOString()
      }).eq("id", ad.id);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess("Anúncio renovado e no topo da lista!");
      refetchAds();
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao renovar anúncio.");
    }
  };

  const handleBoostAd = async (adId: string) => {
    const toastId = showLoading("Impulsionando anúncio...");
    try {
      const { error } = await supabase.rpc('spend_credits_for_boost', { ad_id_param: adId });
      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Anúncio impulsionado com sucesso!`);
      refetchAds();
      queryClient.invalidateQueries({ queryKey: ["userCredits", session?.user?.id] });
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

  if (isLoadingProfile) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex">
            <TabsTrigger value="my-ads">Meus Anúncios</TabsTrigger>
            <TabsTrigger value="offers">Minhas Ofertas</TabsTrigger>
            <TabsTrigger value="analytics">Desempenho</TabsTrigger>
            <TabsTrigger value="favorites">Meus Favoritos</TabsTrigger>
            <TabsTrigger value="reviews">Minhas Avaliações</TabsTrigger>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="verification">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Verificação
              </div>
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        
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
                    {isLoadingCredits ? <Skeleton className="h-5 w-8" /> : <span>{credits?.balance}</span>}
                    <span className="text-sm font-medium text-muted-foreground">Créditos</span>
                  </div>
                  <Button onClick={() => setIsCreditsDialogOpen(true)}>Comprar Créditos</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingAds ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </div>
                ) : userAds && userAds.length > 0 ? (
                  userAds.map((ad) => {
                    const now = new Date();
                    const cooldownMs = 24 * 60 * 60 * 1000;

                    let isRenewOnCooldown = false;
                    let hoursLeft = 0;
                    if (ad.last_renewed_at) {
                        const lastRenewedDate = new Date(ad.last_renewed_at);
                        if (isValid(lastRenewedDate)) {
                            const timeDiff = now.getTime() - lastRenewedDate.getTime();
                            if (timeDiff < cooldownMs) {
                                isRenewOnCooldown = true;
                                hoursLeft = Math.ceil((cooldownMs - timeDiff) / (1000 * 60 * 60));
                            }
                        }
                    }

                    let isBoosted = false;
                    if (ad.boosted_until) {
                        const boostedUntilDate = new Date(ad.boosted_until);
                        if (isValid(boostedUntilDate)) {
                            isBoosted = boostedUntilDate > now;
                        }
                    }
                    
                    const boostCost = parseInt(settings?.boost_price || '10');

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
                                    <AlertDialogDescription>
                                      Seu anúncio será exibido com destaque por {settings?.boost_duration_days || 7} dias.
                                      Isso custará {boostCost} créditos. Você tem {credits?.balance} créditos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleBoostAd(ad.id)} disabled={(credits?.balance || 0) < boostCost}>
                                      Confirmar Impulso
                                    </AlertDialogAction>
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
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Button variant="outline" size="icon" onClick={() => handleRenewAd(ad)} disabled={isRenewOnCooldown}>
                                      <RefreshCw className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent><p>{isRenewOnCooldown ? `Aguarde ${hoursLeft}h para renovar` : "Renovar (volta ao topo)"}</p></TooltipContent>
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
                    {isLoadingReviews ? <p>Carregando avaliações...</p> : reviews && reviews.length > 0 ? (
                        <div className="space-y-4">
                            {reviews.map((review: any) => (
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
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>Atualize suas informações e foto de perfil.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={getOptimizedImageUrl(profile?.avatar_url, { width: 160, height: 160 })} />
                      <AvatarFallback>{profile?.full_name?.[0] || session?.user.email?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <FormField
                      control={profileForm.control}
                      name="avatar"
                      render={() => (
                        <FormItem>
                          <FormLabel>Alterar foto</FormLabel>
                          <FormControl>
                            <Input type="file" accept="image/*" {...profileForm.register("avatar")} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={profileForm.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
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
                            <span className="absolute left-3 text-muted-foreground text-sm">trokazz.com/loja/</span>
                            <Input placeholder="seu_usuario" className="pl-[150px]" {...field} />
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
                        <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
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
                        <FormControl><Input placeholder="Ex: montador_moveis, eletricista, frete" {...field} /></FormControl>
                        <FormDescription>
                          Se você é um prestador de serviço, adicione suas especialidades aqui, separadas por vírgula. Isso ajudará os clientes a te encontrarem.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              <Button type="submit" disabled={isSubmitting} className="mt-6">
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
    <BuyCreditsDialog isOpen={isCreditsDialogOpen} onOpenChange={setIsCreditsDialogOpen} />
    </>
  );
};

export default Profile;