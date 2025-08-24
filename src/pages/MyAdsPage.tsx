import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Eye, CheckSquare, Pencil, PauseCircle, PlayCircle, Zap, Gem, CalendarX, Loader2 } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { safeFormatDate, getOptimizedImageUrl, getRelativePathFromUrlOrPath } from "@/lib/utils";
import { Advertisement, Profile as ProfileType, UserLevelDetails } from "@/types/database";
import { differenceInDays, isValid } from 'date-fns';
import BuyCreditsDialog from "@/components/BuyCreditsDialog";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useState } from "react";
import * as Icons from "lucide-react";
import usePageMetadata from "@/hooks/usePageMetadata";

type UserAd = Advertisement & { status: string; view_count: number; last_renewed_at: string | null; boosted_until: string | null; expires_at: string | null; };

const fetchUserAdsData = async (userId: string) => {
  const { data: ads, error: adsError } = await supabase
    .from("advertisements")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (adsError) throw new Error(`Erro ao buscar anúncios: ${adsError.message}`);

  const { data: creditsData, error: creditsError } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .single();
  if (creditsError && creditsError.code !== 'PGRST116') throw new Error(`Erro ao buscar créditos: ${creditsError.message}`);

  const { data: settings, error: settingsError } = await supabase.from("site_settings").select("key, value");
  if (settingsError) throw new new Error(settingsError.message);
  const siteSettings = settings.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as { [key: string]: any });

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(`*, userLevelDetails:user_levels ( * )`)
    .eq("id", userId)
    .single();
  if (profileError) throw new Error(`Erro ao buscar perfil: ${profileError.message}`);

  const profileWithLevel: ProfileType = {
    ...profileData,
    userLevelDetails: profileData.userLevelDetails as unknown as UserLevelDetails || null,
  };

  return {
    ads: ads as UserAd[],
    credits: creditsData || { balance: 0 },
    settings: siteSettings,
    profile: profileWithLevel,
  };
};

const MyAdsPage = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["myAdsPageData", session?.user?.id],
    queryFn: () => fetchUserAdsData(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  const userAds = data?.ads || [];
  const credits = data?.credits;
  const settings = data?.settings;
  const profile = data?.profile;

  usePageMetadata({
    title: "Meus Anúncios - Trokazz",
    description: "Gerencie seus anúncios publicados no Trokazz.",
    keywords: "meus anúncios, gerenciar anúncios, vender, trocar, trokazz",
    ogUrl: window.location.href,
  });

  const handleDeleteAd = async (adId: string, imageUrls: string[]) => {
    const toastId = showLoading("Excluindo anúncio...");
    try {
      if (imageUrls && imageUrls.length > 0) {
        const imagePaths = imageUrls.map(url => getRelativePathFromUrlOrPath(url, 'advertisements')).filter(Boolean);
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

  const handleRenewAd = async (adId: string) => {
    const toastId = showLoading("Renovando anúncio...");
    try {
      const { error } = await supabase
        .from("advertisements")
        .update({ expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
        .eq("id", adId);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess("Anúncio renovado com sucesso por mais 30 dias!");
      refetch();
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao renovar anúncio.");
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
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError) {
    return <p className="text-red-500 text-center py-4">Erro ao carregar seus anúncios: {error?.message}</p>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
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
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userAds && userAds.length > 0 ? (
              userAds.map((ad: UserAd) => {
                const now = new Date();
                let isBoosted = false;
                if (ad.boosted_until) {
                    const boostedUntilDate = new Date(ad.boosted_until);
                    if (isValid(boostedUntilDate)) {
                        isBoosted = boostedUntilDate > now;
                    }
                }
                
                const boostCost = parseInt(settings?.boost_price || '25');
                const userDiscountPercentage = profile?.userLevelDetails?.boost_discount_percentage || 0;
                const discountedBoostCost = Math.max(0, boostCost - (boostCost * userDiscountPercentage / 100));
                const userBalance = credits?.balance || 0;
                const hasEnoughCredits = userBalance >= discountedBoostCost;

                const expiresAtDate = ad.expires_at ? new Date(ad.expires_at) : null;
                const isExpired = expiresAtDate ? expiresAtDate <= now : false;
                const daysUntilExpiration = expiresAtDate ? differenceInDays(expiresAtDate, now) : null;

                return (
                  <div key={ad.id} className="flex items-center justify-between p-2 border rounded-lg gap-2 flex-wrap">
                    <div className="flex items-center gap-4 flex-grow min-w-[250px]">
                      <Link to={`/anuncio/${ad.id}`} className="flex items-center gap-4">
                        <img src={getOptimizedImageUrl(ad.image_urls?.[0], { width: 150, height: 150 }, 'advertisements') || '/placeholder.svg'} alt={ad.title} className="w-16 h-16 object-cover rounded-md" />
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
                            {expiresAtDate && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <CalendarX className="h-4 w-4" />
                                {isExpired ? (
                                  <span className="text-red-500">Expirado</span>
                                ) : (
                                  <span>Expira em {daysUntilExpiration} dias</span>
                                )}
                              </div>
                            )}
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
                                    O custo normal é de {boostCost} créditos. Com seu nível, você paga apenas <span className="font-bold text-primary">{discountedBoostCost} créditos</span> ({profile?.userLevelDetails?.boost_discount_percentage || 0}% de desconto).
                                    Você tem {userBalance} créditos.
                                  </AlertDialogDescription>
                                ) : (
                                  <AlertDialogDescription>
                                    Você não tem créditos suficientes. Para impulsionar "{ad.title}" por {settings?.boost_duration_days || 7} dias, você precisa de {discountedBoostCost} créditos, mas possui apenas {userBalance}.
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
                          {(isExpired || (daysUntilExpiration !== null && daysUntilExpiration <= 7)) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => handleRenewAd(ad.id)}>
                                  <CalendarX className="h-4 w-4 text-blue-500" />
                                </Button>
                              </TooltipTrigger>
                                <TooltipContent><p>Renovar anúncio</p></TooltipContent>
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
      <BuyCreditsDialog isOpen={isCreditsDialogOpen} onOpenChange={setIsCreditsDialogOpen} />
    </>
  );
};

export default MyAdsPage;