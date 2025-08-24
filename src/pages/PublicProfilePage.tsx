import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, BadgeCheck } from "lucide-react";
import AdCard from "@/components/AdCard";
import { useSession } from "@/contexts/SessionContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ReputationBadge, { ReputationBadgeType } from "@/components/ReputationBadge";
import { safeFormatDate, getOptimizedImageUrl } from "@/lib/utils";
import { Advertisement, ReviewWithReviewer, UserLevelDetails, Profile as ProfileType } from "@/types/database"; // Corrected import for Advertisement
import usePageMetadata from "@/hooks/usePageMetadata";
import * as Icons from "lucide-react";

const reviewSchema = z.object({
  rating: z.number().min(1, "A avaliação geral é obrigatória.").max(5),
  comment: z.string().min(10, "O comentário deve ter pelo menos 10 caracteres.").max(500, "O comentário não pode exceder 500 caracteres."),
  communication_rating: z.number().min(1, "A avaliação de comunicação é obrigatória.").max(5),
  punctuality_rating: z.number().min(1, "A avaliação de pontualidade é obrigatória.").max(5),
  item_quality_rating: z.number().min(1, "A avaliação de qualidade do item é obrigatória.").max(5),
});

const fetchProfileByUsername = async (username: string) => {
  console.log(`PublicProfilePage: Fetching profile for username: ${username}`);
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(`*, user_badges ( badges ( id, name, description, icon ) )`)
    .eq("username", username)
    .maybeSingle(); // Alterado para maybeSingle()

  if (profileError) {
    console.error("PublicProfilePage: Error fetching profile:", profileError);
    throw new Error(profileError.message); // Lança o erro real se houver um problema no Supabase
  }
  
  if (!profileData) {
    console.log(`PublicProfilePage: No profile found for username: ${username}`);
    return null; // Retorna null se nenhum perfil for encontrado
  }
  
  console.log("PublicProfilePage: Profile data fetched:", profileData);
  
  let userLevelDetails: UserLevelDetails | null = null;
  if (profileData.user_level) {
    const { data: levelData, error: levelError } = await supabase
      .from("user_levels")
      .select("*")
      .eq("level_name", profileData.user_level)
      .single();
    if (levelError) console.error("Error fetching user level details:", levelError);
    userLevelDetails = levelData;
  }

  let badges: ReputationBadgeType[] = [];
  if (Array.isArray(profileData.user_badges)) {
    badges = profileData.user_badges
      .map((userBadge: any) => userBadge?.badges)
      .filter((badge: any): badge is ReputationBadgeType => 
        badge && typeof badge === 'object' && 
        typeof badge.id === 'string' &&
        typeof badge.name === 'string' &&
        typeof badge.description === 'string' &&
        typeof badge.icon === 'string'
      );
  }

  const profileWithDetails = { ...profileData, badges, userLevelDetails };
  delete (profileWithDetails as any).user_badges;

  return profileWithDetails;
};

const fetchAdsByUserId = async (userId: string) => {
    const { data, error } = await supabase.from("advertisements").select("*").eq("user_id", userId).eq("status", "approved").order("created_at", { ascending: false });
    if (error) throw new Error("Erro ao carregar anúncios.");
    return data as Advertisement[];
}

const fetchReviewsBySellerId = async (sellerId: string): Promise<ReviewWithReviewer[]> => {
    const { data: rawReviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching reviews:", error);
        throw new Error("Erro ao carregar avaliações.");
    }

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
      return rawReviews.map(r => ({ ...r, reviewer: null })) as ReviewWithReviewer[];
    }

    return rawReviews.map(review => ({
      ...review,
      reviewer: reviewersData?.find(p => p.id === review.reviewer_id) || null
    })) as ReviewWithReviewer[];
}

const PublicProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [hoverRating, setHoverRating] = useState(0);
  const [hoverCommRating, setHoverCommRating] = useState(0);
  const [hoverPunctRating, setHoverPunctRating] = useState(0);
  const [hoverItemRating, setHoverItemRating] = useState(0);


  const { data: profile, isLoading: isLoadingProfile, isError: isProfileError, error: profileError } = useQuery({
    queryKey: ["publicProfile", username],
    queryFn: () => fetchProfileByUsername(username!),
    enabled: !!username,
  });

  const { data: ads, isLoading: isLoadingAds } = useQuery({
      queryKey: ["profileAds", profile?.id],
      queryFn: () => fetchAdsByUserId(profile!.id),
      enabled: !!profile,
  });

  const { data: reviews, isLoading: isLoadingReviews, isError: isReviewsError, error: reviewsError } = useQuery({
      queryKey: ["profileReviews", profile?.id],
      queryFn: () => fetchReviewsBySellerId(profile!.id),
      enabled: !!profile,
  });

  usePageMetadata({
    title: profile ? `${profile.full_name} (@${profile.username}) - Trokazz` : "Perfil de Usuário - Trokazz",
    description: profile ? `Veja os anúncios e avaliações de ${profile.full_name} no Trokazz. ${profile.service_tags?.join(', ') || ''}` : "Perfil de usuário no Trokazz.",
    keywords: profile ? `${profile.full_name}, ${profile.username}, ${profile.service_tags?.join(', ')}, vendedor, trokazz, dourados` : "perfil, usuário, vendedor, trokazz",
    ogImage: profile?.avatar_url ? getOptimizedImageUrl(profile.avatar_url, { width: 200, height: 200 }, 'avatars') : `${window.location.origin}/logo.png`,
    ogUrl: window.location.href,
  });

  const reviewForm = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { 
      rating: 0, 
      comment: "",
      communication_rating: 0,
      punctuality_rating: 0,
      item_quality_rating: 0,
    },
  });

  const onReviewSubmit = async (values: z.infer<typeof reviewSchema>) => {
    if (!user) return showError("Você precisa estar logado para avaliar.");
    if (!profile) return;
    if (user.id === profile.id) return showError("Você não pode avaliar a si mesmo.");

    const toastId = showLoading("Enviando sua avaliação...");
    try {
      const { error } = await supabase.from("reviews").insert({
        seller_id: profile.id,
        reviewer_id: user.id,
        rating: values.rating,
        comment: values.comment,
        communication_rating: values.communication_rating,
        punctuality_rating: values.punctuality_rating,
        item_quality_rating: values.item_quality_rating,
      });

      if (error) {
        if (error.code === '23505') throw new Error("Você já avaliou este vendedor.");
        throw error;
      }

      dismissToast(toastId);
      showSuccess("Avaliação enviada com sucesso!");
      reviewForm.reset({ 
        rating: 0, 
        comment: "", 
        communication_rating: 0, 
        punctuality_rating: 0, 
        item_quality_rating: 0 
      });
      queryClient.invalidateQueries({ queryKey: ["profileReviews", profile.id] });
      queryClient.invalidateQueries({ queryKey: ["publicProfile", username] }); // Invalidate profile to update reputation/level
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0;

  if (isLoadingProfile) {
    return (
        <div className="container mx-auto p-4">
            <Skeleton className="h-32 w-full mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }

  if (isProfileError) return <div className="text-center py-10 text-red-500">Erro: {profileError.message}</div>;
  if (!profile) return <div className="text-center py-10">Perfil não encontrado.</div>;

  console.log(`PublicProfilePage: Rendering profile for ${profile.username}. is_verified: ${profile.is_verified}`);
  const LevelIcon = profile.userLevelDetails?.badge_icon ? (Icons as any)[profile.userLevelDetails.badge_icon] || Icons.HelpCircle : Icons.User;

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <Avatar className="h-24 w-24"><AvatarImage src={getOptimizedImageUrl(profile.avatar_url, { width: 200, height: 200 }, 'avatars') || undefined} loading="lazy" /><AvatarFallback>{profile.full_name?.[0] || 'V'}</AvatarFallback></Avatar>
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-2xl font-bold">{profile.full_name}</h1>
              {profile.is_verified && (
                <Tooltip>
                  <TooltipTrigger>
                    <BadgeCheck className="h-6 w-6 fill-teal-500 text-white" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Vendedor Verificado</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {profile.user_level && profile.userLevelDetails && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 py-1 px-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      <LevelIcon className="h-4 w-4" />
                      <span className="font-semibold text-sm">{profile.userLevelDetails.level_name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{profile.userLevelDetails.description}</p>
                    {profile.reputation_score !== null && <p>Pontuação de Reputação: {profile.reputation_score.toFixed(0)}</p>}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground justify-center sm:justify-start">
              <div className="flex items-center"><Star className={`h-5 w-5 ${averageRating > 0 ? 'text-yellow-400 fill-yellow-400' : ''}`} /><span className="ml-1 font-semibold">{averageRating.toFixed(1)}</span></div>
              <span>({reviews?.length || 0} avaliações)</span>
            </div>
            {profile.created_at && <p className="text-sm text-muted-foreground mt-1">Membro desde {safeFormatDate(profile.created_at, 'LLLL yyyy')}</p>}
            {profile.badges && profile.badges.length > 0 && <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">{profile.badges.map((badge: ReputationBadgeType) => <ReputationBadge key={badge.id} badge={badge} />)}</div>}
          </div>
        </CardContent>
      </Card>
      <Tabs defaultValue="ads" className="w-full">
        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="ads">Anúncios ({ads?.length || 0})</TabsTrigger><TabsTrigger value="reviews">Avaliações ({reviews?.length || 0})</TabsTrigger></TabsList>
        <TabsContent value="ads"><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">{isLoadingAds ? <Skeleton className="h-64 w-full col-span-full" /> : ads && ads.length > 0 ? ads.map(ad => <AdCard key={ad.id} ad={ad} />) : <p className="col-span-full text-center text-muted-foreground py-8">Este vendedor não tem anúncios ativos.</p>}</div></TabsContent>
        <TabsContent value="reviews">
          {isReviewsError && <div className="text-center py-10 text-red-500">Erro: {reviewsError.message}</div>}
          {isLoadingReviews && <p>Carregando avaliações...</p>}
          {reviews && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <div className="space-y-6">
                <h2 className="text-xl font-bold">O que outros compradores dizem</h2>
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getOptimizedImageUrl(review.reviewer?.avatar_url, { width: 100, height: 100 }, 'avatars')} loading="lazy" />
                          <AvatarFallback>{review.reviewer?.full_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold">{review.reviewer?.full_name || 'Usuário'}</p>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-2 pl-12">{review.comment}</p>
                      {(review.communication_rating || review.punctuality_rating || review.item_quality_rating) && (
                        <div className="pl-12 mt-2 text-sm text-muted-foreground space-y-1">
                          {review.communication_rating && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Comunicação:</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (<Star key={i} className={`h-4 w-4 ${i < review.communication_rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />))}
                              </div>
                            </div>
                          )}
                          {review.punctuality_rating && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Pontualidade:</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (<Star key={i} className={`h-4 w-4 ${i < review.punctuality_rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />))}
                              </div>
                            </div>
                          )}
                          {review.item_quality_rating && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Qualidade do Item:</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (<Star key={i} className={`h-4 w-4 ${i < review.item_quality_rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">Este vendedor ainda não recebeu avaliações.</p>
                )}
              </div>
              {user && user.id !== profile.id && (
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Deixar uma avaliação</CardTitle>
                      <CardDescription>Compartilhe sua experiência com este vendedor.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...reviewForm}>
                        <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4">
                          <FormField
                            control={reviewForm.control}
                            name="rating"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Avaliação Geral</FormLabel>
                                <FormControl>
                                  <div className="flex" onMouseLeave={() => setHoverRating(0)}>
                                    {[...Array(5)].map((_, i) => {
                                      const ratingValue = i + 1;
                                      return (
                                        <Star
                                          key={ratingValue}
                                          className={`h-8 w-8 cursor-pointer transition-colors ${ratingValue <= (hoverRating || field.value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                          onClick={() => field.onChange(ratingValue)}
                                          onMouseEnter={() => setHoverRating(ratingValue)}
                                        />
                                      );
                                    })}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={reviewForm.control}
                            name="communication_rating"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Comunicação</FormLabel>
                                <FormControl>
                                  <div className="flex" onMouseLeave={() => setHoverCommRating(0)}>
                                    {[...Array(5)].map((_, i) => {
                                      const ratingValue = i + 1;
                                      return (
                                        <Star
                                          key={ratingValue}
                                          className={`h-8 w-8 cursor-pointer transition-colors ${ratingValue <= (hoverCommRating || field.value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                          onClick={() => field.onChange(ratingValue)}
                                          onMouseEnter={() => setHoverCommRating(ratingValue)}
                                        />
                                      );
                                    })}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={reviewForm.control}
                            name="punctuality_rating"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pontualidade</FormLabel>
                                <FormControl>
                                  <div className="flex" onMouseLeave={() => setHoverPunctRating(0)}>
                                    {[...Array(5)].map((_, i) => {
                                      const ratingValue = i + 1;
                                      return (
                                        <Star
                                          key={ratingValue}
                                          className={`h-8 w-8 cursor-pointer transition-colors ${ratingValue <= (hoverPunctRating || field.value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                          onClick={() => field.onChange(ratingValue)}
                                          onMouseEnter={() => setHoverPunctRating(ratingValue)}
                                        />
                                      );
                                    })}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={reviewForm.control}
                            name="item_quality_rating"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Qualidade do Item</FormLabel>
                                <FormControl>
                                  <div className="flex" onMouseLeave={() => setHoverItemRating(0)}>
                                    {[...Array(5)].map((_, i) => {
                                      const ratingValue = i + 1;
                                      return (
                                        <Star
                                          key={ratingValue}
                                          className={`h-8 w-8 cursor-pointer transition-colors ${ratingValue <= (hoverItemRating || field.value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                          onClick={() => field.onChange(ratingValue)}
                                          onMouseEnter={() => setHoverItemRating(ratingValue)}
                                        />
                                      );
                                    })}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={reviewForm.control}
                            name="comment"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Seu comentário</FormLabel>
                                <FormControl><Textarea placeholder="Descreva como foi sua negociação..." {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={reviewForm.formState.isSubmitting}>Enviar Avaliação</Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PublicProfilePage;