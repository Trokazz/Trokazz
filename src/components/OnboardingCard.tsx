import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, User, Newspaper, Sparkles } from "lucide-react";
import { Profile, Advertisement } from "@/types/database";
import { Skeleton } from "./ui/skeleton";

interface OnboardingCardProps {
  profile: Profile | null | undefined;
  ads: Advertisement[] | null | undefined;
  isLoading: boolean;
}

const OnboardingCard = ({ profile, ads, isLoading }: OnboardingCardProps) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem("onboardingDismissed") === "true";
    setDismissed(isDismissed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("onboardingDismissed", "true");
    setDismissed(true);
  };

  if (dismissed || isLoading) {
    if (dismissed) return null; // Don't render if dismissed
    return <Skeleton className="h-48 w-full" />; // Show skeleton while loading
  }

  const isProfileIncomplete = !profile?.full_name || !profile?.username;
  const hasNoAds = ads && ads.length === 0;

  // Only show if profile is incomplete OR profile is complete but no ads
  if (!isProfileIncomplete && !hasNoAds) {
    return null; // Onboarding is complete
  }

  const progressValue = isProfileIncomplete ? 50 : 100;

  return (
    <Card className="relative bg-gradient-to-r from-primary to-accent-gradient text-primary-foreground shadow-lg">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 text-primary-foreground/80 hover:text-primary-foreground"
        onClick={handleDismiss}
      >
        <XCircle className="h-5 w-5" />
        <span className="sr-only">Dispensar</span>
      </Button>
      <CardHeader>
        <CardTitle className="text-2xl">Bem-vindo(a) ao Trokazz!</CardTitle>
        <CardDescription className="text-primary-foreground/90">
          Complete algumas etapas para começar a usar a plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Progresso</p>
              <span className="text-sm">{progressValue}%</span>
            </div>
            <Progress value={progressValue} className="h-2 bg-primary-foreground/30" />
          </div>
        </div>

        {isProfileIncomplete ? (
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">1. Complete seu Perfil</h3>
              <p className="text-sm text-primary-foreground/90">
                Adicione seu nome completo e nome de usuário para que outros possam te encontrar.
              </p>
              <Button asChild className="mt-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                <Link to="/perfil?tab=perfil">Ir para o Perfil</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">1. Perfil Completo!</h3>
              <p className="text-sm text-primary-foreground/90">
                Seu perfil está pronto para uso.
              </p>
            </div>
          </div>
        )}

        {!isProfileIncomplete && hasNoAds && (
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
              <Newspaper className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">2. Crie seu Primeiro Anúncio</h3>
              <p className="text-sm text-primary-foreground/90">
                Comece a vender ou trocar publicando seu primeiro item. É grátis!
              </p>
              <Button asChild className="mt-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                <Link to="/novo-anuncio">
                  <Sparkles className="mr-2 h-4 w-4" /> Publicar Anúncio
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingCard;