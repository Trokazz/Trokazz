import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAdListItem } from "@/components/UserAdListItem";
import { Link, useNavigate, useSearchParams } from "react-router-dom"; // Import useSearchParams
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ProfileSettingsForm from "@/components/ProfileSettingsForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, Users, TrendingUp, Star, Wrench, GalleryHorizontal, CalendarCheck, CalendarDays, ArrowLeft, Settings, Layers, DollarSign, Zap, PlusCircle, Edit, Trash2, List, MessageSquare, Heart, Package2, ArrowRight, Gift, ReceiptText, Briefcase, BadgeCheck, Bell, BellOff, LogOut, UserCheck, LifeBuoy } from "lucide-react"; // Import LifeBuoy for support
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useMemo, Suspense, useEffect, useState } from "react"; // Import useEffect, useState
import { showError, showSuccess } from "@/utils/toast";
import StarRating from "@/components/StarRating";
import OfferListItem from "@/components/OfferListItem";
import { formatPrice } from "@/utils/formatters";
import BadgeDisplay from "@/components/BadgeDisplay";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { registerServiceWorker, subscribeUserToPush, unsubscribeUserFromPush } from "@/utils/pushNotifications"; // Import push notification utilities

// Lazy-loaded components for desktop tabs
const LazyUserMyAdsPage = React.lazy(() => import('@/components/lazy/LazyUserMyAdsPage'));
const LazyUserMyOffersMadePage = React.lazy(() => import('@/components/lazy/LazyUserMyOffersMadePage'));
const LazyUserMyOffersReceivedPage = React.lazy(() => import('@/components/lazy/LazyUserMyOffersReceivedPage'));
// const LazyMyAppointmentsPage = React.lazy(() => import('@/components/lazy/LazyMyAppointmentsPage')); // REMOVED
const LazyUserFavoritesPage = React.lazy(() => import('@/components/lazy/LazyUserFavoritesPage'));
const LazyUserCreditTransactionsPage = React.lazy(() => import('@/components/lazy/LazyUserCreditTransactionsPage')); // New lazy import
const LazyProfileSettingsForm = React.lazy(() => import('@/components/ProfileSettingsForm')); // Changed to direct import as it's a simple form

// Utility function to validate UUID
const isValidUUID = (uuid: string) => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
};

const fetchUserProfile = async (userId: string) => {
  if (!userId || !isValidUUID(userId)) {
    console.error("Invalid or missing userId for fetchUserProfile:", userId);
    throw new Error("Invalid User ID for profile data.");
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*, user_levels(*)')
    .eq('id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const fetchUserCredits = async (userId: string) => {
  if (!userId || !isValidUUID(userId)) {
    console.error("Invalid or missing userId for fetchUserCredits:", userId);
    return 0;
  }
  const { data, error } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data?.balance || 0;
};

const fetchUserBadges = async (userId: string) => {
  if (!userId || !isValidUUID(userId)) {
    console.error("Invalid or missing userId for fetchUserBadges:", userId);
    return []; // Return empty array for invalid user IDs
  }
  // Directly query user_badges and join with badges
  const { data, error } = await supabase
    .from('user_badges')
    .select(`
      awarded_at,
      badges (
        id,
        name,
        description,
        icon
      )
    `)
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false }); // Order directly

  if (error) {
    console.error("Error fetching user badges for userId", userId, ":", error.message);
    throw new Error(error.message);
  }

  // Flatten the data to match the expected BadgeDetail interface
  return data.map(ub => ({
    id: ub.badges?.id,
    name: ub.badges?.name,
    description: ub.badges?.description,
    icon: ub.badges?.icon,
    awarded_at: ub.awarded_at,
  }));
};

const fetchVerificationStatus = async (userId: string) => {
  if (!userId || !isValidUUID(userId)) return null;
  const { data, error } = await supabase
    .from('verification_requests')
    .select('status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.status || null;
};


const UserProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams(); // Initialize useSearchParams
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isCheckingPushStatus, setIsCheckingPushStatus] = useState(true);

  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchUserProfile(user!.id),
    enabled: !!user && !!user.id && isValidUUID(user.id), // More robust check
    retry: 1,
  });

  const { data: userCredits, isLoading: isLoadingCredits } = useQuery({
    queryKey: ['userCredits', user?.id],
    queryFn: () => fetchUserCredits(user!.id),
    enabled: !!user && !!user.id && isValidUUID(user.id), // More robust check
  });

  const { data: userBadges, isLoading: isLoadingBadges } = useQuery({
    queryKey: ['userBadges', user?.id],
    queryFn: () => fetchUserBadges(user!.id),
    enabled: !!user && !!user.id && isValidUUID(user.id), // More robust check
  });

  const { data: verificationStatus, isLoading: isLoadingVerificationStatus } = useQuery({
    queryKey: ['verificationStatus', user?.id],
    queryFn: () => fetchVerificationStatus(user!.id),
    enabled: !!user && !!user.id && isValidUUID(user.id),
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const needsProfessionalSetup = useMemo(() => {
    if (!profile) return false;
    // Check if the user is a service provider and if essential fields are missing
    return profile.account_type === 'service_provider' && (!profile.store_type || !profile.address);
  }, [profile]);

  // Effect to handle Stripe payment feedback
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (paymentStatus === 'success') {
      showSuccess('Compra de créditos realizada com sucesso!');
      // Optionally, you might want to verify the session_id with your backend
      // to prevent tampering, though the webhook already handles the credit update.
    } else if (paymentStatus === 'cancelled') {
      showError('Compra de créditos cancelada.');
    }

    // Clear the URL parameters to prevent showing the toast again on refresh
    if (paymentStatus || sessionId) {
      searchParams.delete('payment');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Push Notifications Logic
  useEffect(() => {
    const checkPushSubscription = async () => {
      setIsCheckingPushStatus(true);
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !user) {
        setIsPushEnabled(false);
        setIsCheckingPushStatus(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsPushEnabled(!!subscription);
      } catch (error) {
        console.error("Error checking push subscription:", error);
        setIsPushEnabled(false);
      } finally {
        setIsCheckingPushStatus(false);
      }
    };

    checkPushSubscription();
  }, [user]);

  const handleTogglePushNotifications = async () => {
    if (!user) {
      showError("Você precisa estar logado para gerenciar notificações.");
      return;
    }

    if (isPushEnabled) {
      await unsubscribeUserFromPush(user.id);
      setIsPushEnabled(false);
    } else {
      await subscribeUserToPush(user.id);
      setIsPushEnabled(true);
    }
  };


  if (authLoading || (user && (isLoadingProfile || isLoadingCredits || isLoadingBadges || isLoadingVerificationStatus))) {
    return (
      <div className="flex flex-col h-full bg-background">
        <header className="bg-primary text-primary-foreground p-4 pt-6 text-center relative rounded-b-3xl">
          <Skeleton className="h-6 w-24 mx-auto bg-primary-foreground/20" />
          <div className="flex flex-col items-center text-center space-y-2 mt-4 pb-4">
            <Skeleton className="w-20 h-20 rounded-full border-2 border-white bg-primary-foreground/20" />
            <Skeleton className="h-6 w-32 bg-primary-foreground/20" />
            <Skeleton className="h-5 w-40 bg-primary-foreground/20" />
            <Skeleton className="h-6 w-24 bg-primary-foreground/20" />
          </div>
        </header>

        <main className="p-4 flex-1 space-y-4">
          <div className="flex gap-3 mb-4">
            <Skeleton className="flex-1 h-12 rounded-full" />
            <Skeleton className="flex-1 h-12 rounded-full" />
          </div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p>Por favor, faça login para ver seu perfil.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Login</Link>
        </Button>
      </div>
    );
  }

  if (profileError) {
    console.error("Erro ao carregar o perfil do usuário:", profileError);
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background text-destructive p-4">
        <p className="text-lg font-semibold">Erro ao carregar seu perfil.</p>
        <p className="text-sm text-muted-foreground">{profileError.message}</p>
        <Button onClick={() => navigate('/')} className="mt-4">Voltar para o Início</Button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden flex flex-col flex-1 bg-background pb-16">
        <header className="bg-primary text-primary-foreground p-4 pt-6 text-center relative rounded-b-3xl">
          {/* Botão de voltar removido daqui */}
          <h1 className="text-xl font-bold">Perfil</h1>
          <div className="flex flex-col items-center text-center space-y-2 mt-4 pb-4">
            <Avatar className="w-20 h-20 border-2 border-white">
              <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt={profile?.full_name || "User"} loading="lazy" />
              <AvatarFallback>{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{profile?.full_name}</h2>
              {profile?.is_verified && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center justify-center">
                        <BadgeCheck className="h-5 w-5 text-green-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Perfil Verificado</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5 text-yellow-400" />
              <span>{userCredits} Créditos</span>
            </div>
            {userBadges && userBadges.length > 0 && (
              <BadgeDisplay badges={userBadges} className="mt-2" />
            )}
          </div>
        </header>

        <main className="p-4 flex-1">
          {needsProfessionalSetup && (
            <Card className="mb-4 border-l-4 border-accent bg-accent/10 text-accent-foreground">
              <CardHeader className="flex flex-row items-center gap-3 p-4">
                <Briefcase className="h-6 w-6" />
                <CardTitle className="text-lg">Complete seu Perfil Profissional!</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm mb-3">
                  Para oferecer seus serviços e aparecer nas buscas, precisamos de mais algumas informações.
                </p>
                <Button asChild className="w-full bg-accent hover:bg-accent/90 text-white">
                  <Link to="/onboarding/professional-setup">Configurar Agora</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 mb-4"> {/* Changed to flex for side-by-side buttons */}
            <Button asChild className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-12">
              <Link to="/redeem" className="flex items-center justify-center gap-2">
                <Ticket className="h-5 w-5" />
                <span className="font-medium">Resgatar Voucher</span>
              </Link>
            </Button>
            <Button asChild className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full h-12">
              <Link to="/buy-credits" className="flex items-center justify-center gap-2">
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">Comprar Créditos</span>
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            <Link to="/profile/my-ads">
              <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <List className="h-5 w-5 text-primary" />
                  <span className="font-medium">Meus Anúncios</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>

            <Link to="/profile/my-offers-made">
              <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <Gift className="h-5 w-5 text-primary" />
                  <span className="font-medium">Minhas Ofertas</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>

            <Link to="/profile/my-offers-received">
              <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <span className="font-medium">Ofertas Recebidas</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>

            <Link to="/profile/favorites">
              <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-primary" />
                  <span className="font-medium">Favoritos</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>

            <Link to="/profile/transactions"> {/* New Link for Transactions */}
              <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  <span className="font-medium">Minhas Transações</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>

            {/* Link para a página de Verificação de Perfil */}
            {!profile?.is_verified && verificationStatus !== 'pending' && (
              <Link to="/profile/verify">
                <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors border-l-4 border-blue-500">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-blue-500" />
                    <span className="font-medium text-blue-500">Verificar Perfil</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </Card>
              </Link>
            )}
            {verificationStatus === 'pending' && (
              <Card className="p-4 flex items-center justify-between bg-blue-50/50 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-blue-500" />
                  <span className="font-medium text-blue-700">Verificação Pendente</span>
                </div>
                <span className="text-sm text-muted-foreground">Aguardando revisão</span>
              </Card>
            )}

            <Link to="/profile/user-settings">
              <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-primary" />
                  <span className="font-medium">Configurações</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>
            
            {/* Novo Card para o botão de Suporte */}
            <Link to="/support">
              <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                  <span className="font-medium">Suporte</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>

            {/* Novo Card para o botão de Acompanhar Tickets de Suporte */}
            <Link to="/profile/support-tickets">
              <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                  <span className="font-medium">Meus Tickets de Suporte</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>

            {/* Novo Card para o botão Sair */}
            <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer" onClick={handleLogout}>
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5 text-destructive" />
                <span className="font-medium text-destructive">Sair</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Card>

            {/* Push Notifications Card - Mobile */}
            <Card>
              <CardHeader>
                <CardTitle>Notificações Push</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Receba alertas importantes e atualizações diretamente no seu dispositivo.
                </p>
                <Button
                  onClick={handleTogglePushNotifications}
                  disabled={isCheckingPushStatus}
                  className="w-full"
                  variant={isPushEnabled ? "destructive" : "default"}
                >
                  {isCheckingPushStatus ? (
                    "Verificando..."
                  ) : isPushEnabled ? (
                    <>
                      <BellOff className="mr-2 h-4 w-4" /> Desativar Notificações
                    </>
                  ) : (
                    <>
                      <Bell className="mr-2 h-4 w-4" /> Ativar Notificações
                    </>
                  )}
                </Button>
                {!isPushEnabled && !isCheckingPushStatus && (
                  <p className="text-xs text-muted-foreground mt-2">
                    *Você precisará permitir as notificações no seu navegador.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex flex-col flex-1 bg-background p-4 space-y-4">
        <div className="flex flex-col items-center text-center space-y-2">
          <Avatar className="w-20 h-20">
            <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt={profile?.full_name || "User"} loading="lazy" />
            <AvatarFallback>{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{profile?.full_name}</h2>
            {profile?.is_verified && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center justify-center">
                        <BadgeCheck className="h-5 w-5 text-green-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Perfil Verificado</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
          </div>
          {profile?.user_level && (
            <Badge variant="secondary" className="text-sm">
              Nível: {profile.user_level}
            </Badge>
          )}
          <div className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5 text-yellow-400" />
              <span>{userCredits} Créditos</span>
            </div>
            {userBadges && userBadges.length > 0 && (
              <BadgeDisplay badges={userBadges} className="mt-2" />
            )}
        </div>

        {needsProfessionalSetup && (
            <Card className="mb-4 border-l-4 border-accent bg-accent/10 text-accent-foreground">
              <CardHeader className="flex flex-row items-center gap-3 p-4">
                <Briefcase className="h-6 w-6" />
                <CardTitle className="text-lg">Complete seu Perfil Profissional!</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm mb-3">
                  Para oferecer seus serviços e aparecer nas buscas, precisamos de mais algumas informações.
                </p>
                <Button asChild className="w-full bg-accent hover:bg-accent/90 text-white">
                  <Link to="/onboarding/professional-setup">Configurar Agora</Link>
                </Button>
              </CardContent>
            </Card>
          )}

        <div className="flex gap-3 mb-4"> {/* Changed to flex for side-by-side buttons */}
          <Button asChild className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-12">
            <Link to="/redeem" className="flex items-center justify-center gap-2">
              <Ticket className="h-5 w-5" />
              <span className="font-medium">Resgatar Voucher</span>
            </Link>
          </Button>
          <Button asChild className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full h-12">
            <Link to="/buy-credits" className="flex items-center justify-center gap-2">
              <DollarSign className="h-5 w-5" />
              <span className="font-medium">Comprar Créditos</span>
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="ads" className="w-full flex flex-col flex-1">
          <TabsList className="grid w-full grid-cols-6 bg-primary/10 text-primary"> {/* Adjusted grid-cols */}
            <TabsTrigger value="ads">Meus Anúncios</TabsTrigger>
            <TabsTrigger value="offers-made">Minhas Ofertas</TabsTrigger>
            <TabsTrigger value="offers-received">Ofertas Recebidas</TabsTrigger>
            <TabsTrigger value="favorites">Favoritos</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger> {/* New Tab for Desktop */}
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="ads" className="flex-1 mt-4">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <LazyUserMyAdsPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="offers-made" className="flex-1 mt-4">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <LazyUserMyOffersMadePage />
            </Suspense>
          </TabsContent>
          <TabsContent value="offers-received" className="flex-1 mt-4">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <LazyUserMyOffersReceivedPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="favorites" className="flex-1 mt-4">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <LazyUserFavoritesPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="transactions" className="flex-1 mt-4"> {/* New Tab Content for Desktop */}
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <LazyUserCreditTransactionsPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="settings" className="mt-4 space-y-4">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              {profile && <ProfileSettingsForm profile={profile} onLogout={handleLogout} />}
            </Suspense>
            {/* Push Notifications Card - Desktop */}
            <Card>
              <CardHeader>
                <CardTitle>Notificações Push</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Receba alertas importantes e atualizações diretamente no seu dispositivo.
                </p>
                <Button
                  onClick={handleTogglePushNotifications}
                  disabled={isCheckingPushStatus}
                  className="w-full"
                  variant={isPushEnabled ? "destructive" : "default"}
                >
                  {isCheckingPushStatus ? (
                    "Verificando..."
                  ) : isPushEnabled ? (
                    <>
                      <BellOff className="mr-2 h-4 w-4" /> Desativar Notificações
                    </>
                  ) : (
                    <>
                      <Bell className="mr-2 h-4 w-4" /> Ativar Notificações
                    </>
                  )}
                </Button>
                {!isPushEnabled && !isCheckingPushStatus && (
                  <p className="text-xs text-muted-foreground mt-2">
                    *Você precisará permitir as notificações no seu navegador.
                  </p>
                )}
              </CardContent>
            </Card>
            {/* Novo Card para o botão de Suporte */}
            <Link to="/support">
              <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                  <span className="font-medium">Suporte</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>
            {/* Novo Card para o botão de Acompanhar Tickets de Suporte */}
            <Link to="/profile/support-tickets">
              <Card className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                  <span className="font-medium">Meus Tickets de Suporte</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default UserProfilePage;