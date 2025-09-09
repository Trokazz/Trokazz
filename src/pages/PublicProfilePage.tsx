"use client";

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { formatPrice } from "@/utils/formatters";
import { ArrowLeft, ExternalLink, Edit, PlusCircle, Star, MessageSquarePlus, BadgeCheck, Link as LinkIcon } from "lucide-react"; // Changed UserCheck to BadgeCheck, added LinkIcon
import StarRating from "@/components/StarRating";
import ReviewCard from "@/components/ReviewCard";
import BadgeDisplay from "@/components/BadgeDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { showError } from "@/utils/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Helmet } from "react-helmet-async"; // Import Helmet

// Utility function to validate UUID
const isValidUUID = (uuid: string) => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
};

const fetchPublicProfileData = async (userId: string) => {
  if (!userId || !isValidUUID(userId)) {
    console.error("Invalid or missing userId for fetchPublicProfileData:", userId);
    throw new Error("Invalid User ID for profile data.");
  }
  const { data, error } = await supabase.rpc('get_profile_page_data', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data;
};

const PublicProfilePage = () => {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();

  const { data: profileData, isLoading: isLoadingProfileData, error } = useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => fetchPublicProfileData(userId!),
    enabled: !!userId && isValidUUID(userId),
    retry: 1,
  });

  const isLoading = authLoading || isLoadingProfileData;

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !profileData?.profile) {
    return (
      <div className="p-4 text-destructive text-center">
        <p>Erro ao carregar perfil público: {error?.message || "Perfil não encontrado."}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
      </div>
    );
  }

  const { profile, ads, reviews, credits, settings, creditTransactions, offers_made, offers_received, badges, activity_feed } = profileData;
  const isMyProfile = currentUser?.id === profile.id;

  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length
    : 0;

  const handleStartChat = async () => {
    if (!currentUser) {
      showError("Você precisa estar logado para iniciar um chat.");
      navigate("/auth");
      return;
    }
    if (currentUser.id === profile.id) {
      showError("Você não pode iniciar um chat consigo mesmo.");
      return;
    }

    try {
      const { data: conversationId, error } = await supabase.rpc("get_or_create_conversation", {
        p_buyer_id: currentUser.id,
        p_seller_id: profile.id,
        p_ad_id: null, // Assuming general chat, not tied to a specific ad
      });

      if (error) throw error;
      navigate(`/chat/${conversationId}`);
    } catch (err: any) {
      showError(`Erro ao iniciar chat: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{profile.full_name} | Perfil Trokazz</title>
        <meta name="description" content={profile.biography?.substring(0, 160) || `Perfil de ${profile.full_name} na Trokazz. Veja anúncios e avaliações.`} />
        <meta property="og:title" content={`${profile.full_name} | Perfil Trokazz`} />
        <meta property="og:description" content={profile.biography?.substring(0, 160) || `Perfil de ${profile.full_name} na Trokazz. Veja anúncios e avaliações.`} />
        <meta property="og:image" content={profile.avatar_url || '/placeholder.svg'} />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Hero Section */}
      <div className="relative w-full h-48 bg-primary flex items-center justify-center rounded-b-3xl shadow-md">
        {profile.store_banner_url && (
          <img
            src={profile.store_banner_url}
            alt="Store Banner"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            loading="lazy"
          />
        )}
        <div className="relative z-10 flex flex-col items-center text-primary-foreground">
          <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
            <AvatarImage src={profile.avatar_url || "/placeholder.svg"} alt={profile.full_name || "User"} loading="lazy" />
            <AvatarFallback className="bg-accent text-accent-foreground text-2xl">{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2 mt-3">
            <h1 className="text-2xl font-bold">{profile.full_name || 'N/A'}</h1>
            {profile.is_verified && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center justify-center">
                      <BadgeCheck className="h-6 w-6 text-green-400" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Perfil Verificado</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {profile.user_level && (
            <Badge variant="secondary" className="mt-1 bg-primary-foreground/20 text-primary-foreground">
              Nível: {profile.userLevelDetails_level_name}
            </Badge>
          )}
          {averageRating > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <StarRating rating={averageRating} size="default" className="text-yellow-400" />
              <span className="text-sm text-primary-foreground/80">({averageRating.toFixed(1)})</span>
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 p-4 space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          {!isMyProfile && (
            <Button onClick={handleStartChat} className="bg-blue-500 hover:bg-blue-600 text-white">
              <MessageSquarePlus className="mr-2 h-4 w-4" /> Mensagem
            </Button>
          )}
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Sobre {profile.full_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Membro Desde:</strong> {profile.created_at ? format(new Date(profile.created_at), 'dd/MM/yyyy') : 'N/A'}</p>
            {profile.store_type && <p><strong>Tipo de Serviço:</strong> {profile.store_type}</p>}
            {profile.address && <p><strong>Endereço:</strong> {profile.address}</p>}
            {profile.operating_hours && <p><strong>Horário:</strong> {profile.operating_hours}</p>}
            {profile.service_tags && profile.service_tags.length > 0 && (
              <p><strong>Tags:</strong> {profile.service_tags.join(', ')}</p>
            )}
            {profile.biography && (
              <div>
                <strong>Biografia:</strong> <p className="whitespace-pre-wrap">{profile.biography}</p>
              </div>
            )}
            {profile.social_media_links?.main && (
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                <strong>Link Social:</strong> <a href={profile.social_media_links.main} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">{profile.social_media_links.main}</a>
              </div>
            )}
            {badges && badges.length > 0 && (
              <div>
                <strong>Badges:</strong> <BadgeDisplay badges={badges} className="mt-1" />
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="ads" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="ads">Anúncios ({ads?.length || 0})</TabsTrigger>
            <TabsTrigger value="reviews">Avaliações ({reviews?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="ads" className="mt-4">
            <Card className="shadow-sm">
              <CardHeader><CardTitle>Anúncios de {profile.full_name}</CardTitle></CardHeader>
              <CardContent>
                {ads && ads.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ads.map((ad: any) => (
                      <Card key={ad.id} className="p-3 flex items-center gap-3">
                        <img src={ad.image_urls?.[0] || '/placeholder.svg'} alt={ad.title} className="w-16 h-16 object-cover rounded-md" loading="lazy" />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{ad.title}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(ad.price)}</p>
                        </div>
                        <Link to={`/ad/${ad.id}`} target="_blank" className="text-primary hover:underline">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                    <img src="/logo.png" alt="Trokazz Logo" className="h-12 w-12 mb-4" />
                    <p className="text-lg font-semibold mb-2">Nenhum anúncio publicado por este usuário.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Avaliações de {profile.full_name}</CardTitle>
                {!isMyProfile && currentUser && (
                  <Button asChild size="sm">
                    <Link to={`/submit-review/${profile.id}`}>
                      <MessageSquarePlus className="mr-2 h-4 w-4" /> Avaliar Vendedor
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <ReviewCard 
                        key={review.id} 
                        review={review} 
                        isSeller={false} // This is a public profile, so the current user is not the seller of this profile
                        currentUserId={currentUser?.id} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                    <Star className="h-12 w-12 mb-4" />
                    <p className="text-lg font-semibold mb-2">Nenhuma avaliação ainda.</p>
                    {!isMyProfile && currentUser && (
                      <Button asChild>
                        <Link to={`/submit-review/${profile.id}`}>
                          <MessageSquarePlus className="mr-2 h-4 w-4" /> Seja o primeiro a avaliar!
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PublicProfilePage;