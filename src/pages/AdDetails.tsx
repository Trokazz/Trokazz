"use client";

import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { MapPin, DollarSign, Calendar, User, Star, MessageCircle, Heart, Share2, Clock, Tag, Package, Eye, Menu, ShoppingCart, Phone, Flag, BadgeCheck } from "lucide-react"; // Removed Package2
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ShareButtons } from "@/components/ShareButtons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReviewCard from "@/components/ReviewCard";
import StarRating from "@/components/StarRating";
import MobilePageHeader from "@/components/MobilePageHeader";
import { Helmet } from "react-helmet-async"; // Import Helmet

interface Ad {
  id: string;
  title: string;
  description: string;
  price: number;
  image_urls: string[];
  created_at: string;
  user_id: string;
  category_slug: string;
  subcategory_slug: string;
  condition: string;
  location_city: string;
  location_state: string;
  view_count: number;
  profiles?: { // Tornando profiles opcional
    id: string;
    full_name: string;
    avatar_url: string;
    username: string;
    is_verified: boolean;
    user_level: string;
    phone: string | null;
    userLevelDetails?: {
      level_name: string;
      badge_icon: string;
      min_avg_rating: number;
    };
  };
  category: {
    name: string;
  };
  subcategory: {
    name: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reply_comment: string | null;
  created_at: string;
  reviewer: {
    full_name: string;
    avatar_url: string;
  };
  seller_id: string;
}

const fetchAdDetails = async (id: string): Promise<Ad> => {
  const { data, error } = await supabase
    .from("advertisements")
    .select(
      `
      *,
      profiles (id, full_name, avatar_url, username, is_verified, user_level, phone, userLevelDetails:user_levels(level_name, badge_icon, min_avg_rating)),
      category:categories!fk_category_slug(name),
      subcategory:categories!fk_subcategory_slug(name)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as Ad;
};

const fetchAdReviews = async (sellerId: string): Promise<Review[]> => {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      rating,
      comment,
      reply_comment,
      created_at,
      reviewer:profiles(full_name, avatar_url),
      seller_id
    `
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Review[];
};

const incrementAdViewCount = async (adId: string) => {
  const { error } = await supabase.rpc("increment_ad_view_count", {
    ad_id_param: adId,
  });
  if (error) console.error("Error incrementing view count:", error.message);
};

const AdDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const userId = user?.id;

  const [offerAmount, setOfferAmount] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const {
    data: ad,
    isLoading,
    error,
  } = useQuery<Ad, Error>({
    queryKey: ["adDetails", id],
    queryFn: () => fetchAdDetails(id!),
    enabled: !!id,
  });

  const { data: reviews, isLoading: isLoadingReviews } = useQuery<Review[], Error>({
    queryKey: ["adReviews", ad?.user_id],
    queryFn: () => fetchAdReviews(ad!.user_id),
    enabled: !!ad?.user_id,
  });

  const { data: isFavoriteData, refetch: refetchIsFavorite } = useQuery({
    queryKey: ["isFavorite", id, userId],
    queryFn: async () => {
      if (!userId || !id) return false;
      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("ad_id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    },
    enabled: !!userId && !!id,
  });

  useEffect(() => {
    if (isFavoriteData !== undefined) {
      setIsFavorite(isFavoriteData);
    }
  }, [isFavoriteData]);

  useEffect(() => {
    if (id) {
      incrementAdViewCount(id);
    }
  }, [id]);

  if (isLoading) return <div>Carregando detalhes do anúncio...</div>;
  if (error) return <div>Erro ao carregar anúncio: {error.message}</div>;
  if (!ad) return <div>Anúncio não encontrado.</div>;

  const seller = ad.profiles;
  const isMyAd = userId === ad.user_id;

  const handleMakeOffer = async () => {
    if (!session) {
      showError("Você precisa estar logado para fazer uma oferta.");
      navigate("/auth");
      return;
    }
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      showError("Por favor, insira um valor de oferta válido.");
      return;
    }
    if (parseFloat(offerAmount) >= ad.price) {
      showError("Sua oferta deve ser menor que o preço do anúncio.");
      return;
    }

    try {
      const { error } = await supabase.from("offers").insert({
        ad_id: ad.id,
        buyer_id: userId,
        seller_id: ad.user_id,
        offer_amount: parseFloat(offerAmount),
        status: "pending",
      });

      if (error) throw error;
      showSuccess("Oferta enviada com sucesso!");
      setOfferAmount("");
    } catch (err: any) {
      showError(`Erro ao enviar oferta: ${err.message}`);
    }
  };

  const handleReportAd = async () => {
    if (!session) {
      showError("Você precisa estar logado para denunciar um anúncio.");
      navigate("/auth");
      return;
    }
    if (!reportReason) {
      showError("Por favor, insira um motivo para a denúncia.");
      return;
    }

    try {
      const { error } = await supabase.from("reports").insert({
        ad_id: ad.id,
        reporter_id: userId,
        reason: reportReason,
        status: "pending",
      });

      if (error) throw error;
      showSuccess("Anúncio denunciado com sucesso. Agradecemos sua colaboração!");
      setReportReason("");
    } catch (err: any) {
      showError(`Erro ao denunciar anúncio: ${err.message}`);
    }
  };

  const handleToggleFavorite = async () => {
    if (!session) {
      showError("Você precisa estar logado para favoritar anúncios.");
      navigate("/auth");
      return;
    }

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("ad_id", ad.id);
        if (error) throw error;
        showSuccess("Anúncio removido dos favoritos.");
      } else {
        const { error } = await supabase.from("favorites").insert({
          user_id: userId,
          ad_id: ad.id,
        });
        if (error) throw error;
        showSuccess("Anúncio adicionado aos favoritos!");
      }
      refetchIsFavorite();
    } catch (err: any) {
      showError(`Erro ao gerenciar favoritos: ${err.message}`);
    }
  };

  const handleStartChat = async () => {
    if (!session) {
      showError("Você precisa estar logado para iniciar um chat.");
      navigate("/auth");
      return;
    }
    if (userId === ad.user_id) {
      showError("Você não pode iniciar um chat consigo mesmo.");
      return;
    }

    try {
      const { data: conversationId, error } = await supabase.rpc("get_or_create_conversation", {
        p_buyer_id: userId,
        p_seller_id: ad.user_id,
        p_ad_id: ad.id,
      });

      if (error) throw error;
      navigate(`/chat/${conversationId}`);
    } catch (err: any) {
      showError(`Erro ao iniciar chat: ${err.message}`);
    }
  };

  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  return (
    <div className="flex flex-col min-h-screen bg-background md:bg-primary text-primary-foreground">
      <Helmet>
        <title>{ad.title} | Trokazz</title>
        <meta name="description" content={ad.description?.substring(0, 160) || `Confira este anúncio na Trokazz: ${ad.title}`} />
        <meta property="og:title" content={ad.title} />
        <meta property="og:description" content={ad.description?.substring(0, 160) || `Confira este anúncio na Trokazz: ${ad.title}`} />
        <meta property="og:image" content={ad.image_urls?.[0] || '/placeholder.svg'} />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Mobile Header */}
      <header className="flex md:hidden items-center justify-between p-4 sticky top-0 z-10 bg-primary text-primary-foreground">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <img src="/logo.png" alt="Trokazz Logo" className="h-6 w-6 text-accent" />
          <span className="text-xl font-bold">Trokazz</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => { /* handle share */ }}>
            <Share2 className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/report-ad/${ad.id}`}>Denunciar Anúncio</Link>
              </DropdownMenuItem>
              {userId !== ad.user_id && (
                <DropdownMenuItem asChild>
                  <Link to={`/submit-review/${seller?.id}`}>Avaliar Vendedor</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0"> {/* Added padding-bottom for mobile fixed footer */}
        <Carousel className="w-full">
          <CarouselContent>
            {(ad.image_urls && ad.image_urls.length > 0 ? ad.image_urls : ['/placeholder.svg']).map((src, index) => (
              <CarouselItem key={index}>
                <div className="flex aspect-video items-center justify-center">
                  <img
                    src={src}
                    alt={`Ad image ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="hidden md:block">
            <CarouselPrevious />
            <CarouselNext />
          </div>
        </Carousel>

        {/* Thumbnails */}
        <div className="flex justify-center gap-2 p-2 bg-primary">
          {(ad.image_urls && ad.image_urls.length > 0 ? ad.image_urls : ['/placeholder.svg']).map((src, index) => (
            <img
              key={index}
              src={src}
              alt={`Thumbnail ${index + 1}`}
              className={`w-16 h-16 object-cover rounded-md cursor-pointer border-2 ${currentImageIndex === index ? 'border-accent' : 'border-transparent'}`}
              onClick={() => setCurrentImageIndex(index)}
              loading="lazy"
            />
          ))}
        </div>

        <div className="p-4 space-y-4 bg-primary text-primary-foreground md:rounded-lg md:shadow-lg md:mx-auto md:max-w-3xl">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold">{ad.title}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={handleToggleFavorite}
            >
              <Heart className={isFavorite ? "h-5 w-5 fill-red-500 text-red-500" : "h-5 w-5 text-muted-foreground"} />
            </Button>
          </div>
          <p className="text-4xl font-bold text-accent">{`R$ ${ad.price.toFixed(2).replace(".", ",")}`}</p>

          <div className="flex items-center gap-4"> {/* Container for Share and Report buttons */}
            <ShareButtons adTitle={ad.title} adUrl={window.location.href} />
            {!isMyAd && (
              <Button asChild size="icon" className="bg-card text-card-foreground hover:bg-card/90 rounded-full h-12 w-12">
                <Link to={`/report-ad/${ad.id}`}>
                  <Flag className="h-6 w-6" />
                </Link>
              </Button>
            )}
          </div>

          <Separator className="bg-primary-foreground/10" />

          <div className="pt-2">
            <h2 className="font-semibold text-lg mb-2">Detalhes do Anúncio</h2>
            <div className="space-y-1 text-primary-foreground/80 text-sm"> {/* Adjusted font size */}
              <p className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <strong>Condição:</strong> {ad.condition === 'new' ? 'Novo' : 'Usado'}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <strong>Localização:</strong> {ad.location_city}, {ad.location_state}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <strong>Publicado:</strong> {formatDistanceToNow(new Date(ad.created_at), { addSuffix: true, locale: ptBR })}
              </p>
              {isMyAd && ( // Conditionally render view count for the seller
                <p className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <strong>Visualizações:</strong> {ad.view_count}
                </p>
              )}
              <p className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <strong>Categoria:</strong> {ad.category?.name} / {ad.subcategory?.name}
              </p>
            </div>
          </div>

          <Separator className="bg-primary-foreground/10" />

          <div className="pt-2">
            <h2 className="font-semibold text-lg mb-2">Descrição</h2>
            <p className="text-primary-foreground/80 text-sm whitespace-pre-wrap"> {/* Adjusted font size */}
              {ad.description || 'Nenhuma descrição fornecida.'}
            </p>
          </div>

          <Separator className="bg-primary-foreground/10" />

          <div className="pt-2">
            <h2 className="font-semibold text-lg mb-2">Sobre o Vendedor</h2>
            <Link to={`/profile/${seller?.id}`} className="flex items-center gap-3 group">
              <Avatar className="h-12 w-12">
                <AvatarImage src={seller?.avatar_url || "/placeholder-avatar.jpg"} alt={seller?.full_name || 'Seller'} loading="lazy" />
                <AvatarFallback>{seller?.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold group-hover:underline">{seller?.full_name || 'Unknown Seller'}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-primary-foreground/80">{seller?.userLevelDetails?.level_name || "Nível: Iniciante"}</p>
                  {seller?.is_verified && <BadgeCheck className="h-5 w-5 text-green-500" />} {/* Using BadgeCheck icon */}
                </div>
                {averageRating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <StarRating rating={averageRating} size="small" />
                    <span className="text-sm text-primary-foreground/80">({averageRating.toFixed(1)})</span>
                  </div>
                )}
              </div>
            </Link>
            {/* Removido o botão "Ligar para o Vendedor" */}
          </div>

          {reviews && reviews.length > 0 && (
            <>
              <Separator className="bg-primary-foreground/10" />
              <div className="pt-2">
                <h2 className="font-semibold text-lg mb-2">Avaliações do Vendedor ({reviews.length})</h2>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      isSeller={isMyAd}
                      currentUserId={userId}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Fixed Footer - Mobile Only */}
      <footer className="fixed bottom-0 left-0 right-0 flex md:hidden items-center justify-center gap-4 bg-primary p-4 border-t border-primary-foreground/10 z-50">
        {!isMyAd && (
          <>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex-1 bg-accent hover:bg-accent/90 h-14 text-lg rounded-lg">
                  <ShoppingCart className="mr-2 h-6 w-6" />
                  Fazer Oferta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Fazer uma Oferta</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="offerAmount" className="text-right">
                      Valor da Oferta
                    </Label>
                    <Input
                      id="offerAmount"
                      type="number"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      className="col-span-3"
                      placeholder={`Menor que R$ ${ad.price.toFixed(2)}`}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOfferAmount("")}>Cancelar</Button>
                  <Button onClick={handleMakeOffer}>Enviar Oferta</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              size="icon"
              className="bg-blue-500 hover:bg-blue-600 h-14 w-14 rounded-lg flex-shrink-0"
              onClick={handleStartChat}
            >
              <MessageCircle className="h-6 w-6" />
            </Button>

            <Button asChild variant="destructive" size="icon" className="h-14 w-14 rounded-lg flex-shrink-0">
              <Link to={`/report-ad/${ad.id}`}>
                <Flag className="h-6 w-6" />
              </Link>
            </Button>
          </>
        )}
      </footer>
    </div>
  );
};

export default AdDetails;