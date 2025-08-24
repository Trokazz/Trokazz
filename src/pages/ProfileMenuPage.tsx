import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ReputationBadge, { ReputationBadgeType } from "@/components/ReputationBadge";
import { safeFormatDate, getOptimizedImageUrl } from "@/lib/utils";
import { Profile as ProfileType, UserLevelDetails } from "@/types/database";
import * as Icons from "lucide-react";
import usePageMetadata from "@/hooks/usePageMetadata";
import { Star, BadgeCheck, Pencil, Award, History, MessageSquareText, Heart, LifeBuoy, Info, FileText, Gem, ChartBar, ShieldCheck, LogOut } from "lucide-react"; // Importado LogOut
import { useNavigate } from "react-router-dom"; // Importado useNavigate

const fetchProfileData = async (userId: string): Promise<ProfileType> => {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *, 
      user_badges ( badges ( id, name, description, icon ) )
    `)
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Erro ao buscar perfil:", error);
    throw new Error(error.message);
  }

  let userLevelDetails: UserLevelDetails | null = null;
  if (data.user_level) {
    const { data: levelData, error: levelError } = await supabase
      .from("user_levels")
      .select("*")
      .eq("level_name", data.user_level)
      .single();
    if (levelError) console.error("Error fetching user level details:", levelError);
    userLevelDetails = levelData;
  }

  let badges: ReputationBadgeType[] = [];
  if (Array.isArray(data.user_badges)) {
    badges = data.user_badges
      .map((userBadge: any) => userBadge?.badges)
      .filter((badge: any): badge is ReputationBadgeType => 
        badge && typeof badge === 'object' && 
        typeof badge.id === 'string' &&
        typeof badge.name === 'string' &&
        typeof badge.description === 'string' &&
        typeof badge.icon === 'string'
      );
  }

  const profileWithDetails = { ...data, badges, userLevelDetails };
  delete (profileWithDetails as any).user_badges; // Remove a propriedade original para evitar conflitos

  return profileWithDetails;
};

const ProfileMenuPage = () => {
  const { session } = useSession();
  const navigate = useNavigate(); // Inicializa useNavigate
  const { data: profile, isLoading: isLoadingProfile } = useQuery<ProfileType>({
    queryKey: ["profileMenuPageData", session?.user?.id],
    queryFn: () => fetchProfileData(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  usePageMetadata({
    title: "Meu Perfil - Trokazz",
    description: "Gerencie seus anúncios, ofertas, favoritos e informações de perfil no Trokazz.",
    keywords: "perfil, meus anúncios, ofertas, favoritos, avaliações, créditos, verificação, trokazz",
    ogImage: profile?.avatar_url ? getOptimizedImageUrl(profile.avatar_url, { width: 200, height: 200 }, 'avatars') : `${window.location.origin}/logo.png`,
    ogUrl: window.location.href,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const profileMenuItems = [
    { to: "/perfil/editar", label: "Editar Perfil", icon: Pencil },
    { to: "/perfil/meus-anuncios", label: "Meus Anúncios", icon: Award },
    { to: "/perfil/minhas-ofertas", label: "Minhas Ofertas", icon: Icons.Handshake },
    { to: "/perfil/desempenho", label: "Desempenho", icon: ChartBar },
    { to: "/perfil/historico-transacoes", label: "Histórico de Transações", icon: History },
    { to: "/perfil/notificacoes", label: "Notificações", icon: Icons.BellRing },
    { to: "/perfil/favoritos", label: "Meus Favoritos", icon: Heart },
    { to: "/perfil/verificacao", label: "Verificação", icon: ShieldCheck },
    { to: "/perfil/meus-tickets", label: "Meus Tickets de Suporte", icon: MessageSquareText },
    { to: "/perfil/meus-comentarios", label: "Meus Comentários", icon: Star },
    { to: "/faq", label: "Perguntas Frequentes", icon: LifeBuoy },
    { to: "/contato", label: "Contate-nos", icon: Icons.Mail },
    { to: "/about-us", label: "Sobre Nós", icon: Info },
    { to: "/terms-of-service", label: "Termos e Condições", icon: FileText },
    { to: "/privacy-policy", label: "Política de Privacidade", icon: ShieldCheck },
  ];

  const LevelIcon = profile?.userLevelDetails?.badge_icon ? (Icons as any)[profile.userLevelDetails.badge_icon] || Icons.HelpCircle : Icons.User;

  if (isLoadingProfile) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-40 w-full mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Complete seu Perfil</CardTitle>
          <CardDescription>
            Parece que seu perfil ainda não está completo. Por favor, preencha suas informações para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/perfil/editar">Ir para Editar Perfil</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={getOptimizedImageUrl(profile?.avatar_url, { width: 200, height: 200 }, 'avatars') || undefined} loading="lazy" />
            <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
              {profile?.is_verified && (
                <Tooltip>
                  <TooltipTrigger>
                    <BadgeCheck className="h-6 w-6 fill-teal-500 text-white" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Vendedor Verificado</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {profile?.user_level && profile.userLevelDetails && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 py-1 px-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      <LevelIcon className="h-4 w-4" />
                      <span className="font-semibold text-sm">{profile.userLevelDetails.level_name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{profile.userLevelDetails.description}</p>
                    {profile.reputation_score !== null && <p>Pontuação de Reputação: {profile.reputation_score?.toFixed(0)}</p>}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {profile?.created_at && <p className="text-sm text-muted-foreground mt-1">Membro desde {safeFormatDate(profile.created_at, 'LLLL yyyy')}</p>}
            {profile?.badges && profile.badges.length > 0 && <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">{profile.badges.map((badge: ReputationBadgeType) => <ReputationBadge key={badge.id} badge={badge} />)}</div>}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profileMenuItems.map((item) => (
          <Button key={item.to} asChild variant="outline" className="h-auto py-4 px-6 flex justify-between items-center text-left">
            <Link to={item.to} className="flex items-center w-full">
              <div className="flex items-center gap-4">
                {item.icon && <item.icon className="h-6 w-6 text-primary" />}
                <span className="text-lg font-medium">{item.label}</span>
              </div>
              <Icons.ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>
        ))}
        {/* Botão de Sair adicionado aqui */}
        <Button onClick={handleLogout} variant="destructive" className="h-auto py-4 px-6 flex justify-between items-center text-left">
          <div className="flex items-center gap-4">
            <LogOut className="h-6 w-6" />
            <span className="text-lg font-medium">Sair</span>
          </div>
          <Icons.ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ProfileMenuPage;