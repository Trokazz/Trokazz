import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, UserCircle, MessageCircle, Tag, DollarSign } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import SendMessageButton from "@/components/SendMessageButton";
import { safeFormatDate, getOptimizedImageUrl } from "@/lib/utils";
import ErrorState from "@/components/ErrorState";
import usePageMetadata from "@/hooks/usePageMetadata";
import { WantedAd } from "@/components/WantedAdCard"; // Reusing the WantedAd type

const fetchWantedAdDetails = async (id: string): Promise<WantedAd | null> => {
  const { data, error } = await supabase
    .from("wanted_ads")
    .select(`
      *,
      profiles ( id, full_name, username, avatar_url )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data as WantedAd;
};

const WantedAdDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();

  const { data: wantedAd, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["wantedAdDetails", id],
    queryFn: () => fetchWantedAdDetails(id!),
    enabled: !!id,
  });

  usePageMetadata({
    title: wantedAd ? `Procura: ${wantedAd.title} - Trokazz` : "Detalhes da Procura - Trokazz",
    description: wantedAd ? wantedAd.description || `Confira esta procura no Trokazz: ${wantedAd.title}` : "Detalhes de um anúncio de procura no Trokazz.",
    keywords: wantedAd ? `${wantedAd.title}, ${wantedAd.category_slug}, ${wantedAd.budget}, procura, wanted, dourados, ms, trokazz` : "procura, classificados, dourados, ms",
    ogUrl: window.location.href,
  });

  const formattedBudget = wantedAd?.budget ? new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(wantedAd.budget) : "Não especificado";

  const formattedDate = wantedAd ? safeFormatDate(wantedAd.created_at, "dd 'de' LLLL 'de' yyyy") : "";

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  if (!wantedAd) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Anúncio de procura não encontrado</h2>
        <p className="text-muted-foreground mt-2">O anúncio que você está procurando não existe ou foi removido.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/procurados">Voltar para o Mural de Procurados</Link>
        </Button>
      </div>
    );
  }

  const isOwner = user && wantedAd.profiles && user.id === wantedAd.profiles.id;

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{wantedAd.title}</CardTitle>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Tag className="h-4 w-4" />
            <span>{wantedAd.category_slug}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2 text-2xl font-bold text-primary">
            <DollarSign className="h-6 w-6" />
            <span>{formattedBudget}</span>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Descrição</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{wantedAd.description}</p>
          </div>

          <div className="border-t pt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Publicado por:&nbsp;
              {wantedAd.profiles?.username ? (
                <Link to={`/loja/${wantedAd.profiles.username}`} className="font-bold text-primary hover:underline">
                  {wantedAd.profiles.full_name}
                </Link>
              ) : (
                <strong className="font-bold">{wantedAd.profiles?.full_name || 'Usuário anônimo'}</strong>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>Publicado em: {formattedDate}</span>
            </div>
          </div>

          <div className="mt-6">
            {isOwner ? (
              <Button disabled className="w-full" size="lg">Este é o seu anúncio de procura</Button>
            ) : user ? (
              wantedAd.profiles && (
                <SendMessageButton targetUser={wantedAd.profiles} wantedAdId={wantedAd.id}>
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Tenho o que ele(a) procura!
                </SendMessageButton>
              )
            ) : (
              <Button asChild className="w-full" size="lg">
                <Link to="/login">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Faça login para contatar
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WantedAdDetails;