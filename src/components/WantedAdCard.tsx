import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import ContactBuyerButton from "./ContactBuyerButton";
import { useSession } from "@/contexts/SessionContext";
import { safeFormatDistanceToNow } from "@/lib/utils";

export type WantedAd = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
};

interface WantedAdCardProps {
  ad: WantedAd;
}

const WantedAdCard = ({ ad }: WantedAdCardProps) => {
  const { user } = useSession();
  const isOwner = user?.id === ad.user_id;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{ad.title}</CardTitle>
        <CardDescription>
          Procurando em <span className="font-semibold text-primary">Dourados, MS</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground line-clamp-3">{ad.description}</p>
        {ad.budget && (
          <p className="mt-4 font-bold text-lg">
            Orçamento: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ad.budget)}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
        <div className="flex justify-between w-full items-center">
          {ad.profiles?.username ? (
            <Link to={`/loja/${ad.profiles.username}`} className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={ad.profiles?.avatar_url || undefined} />
                <AvatarFallback>{ad.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{ad.profiles?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {safeFormatDistanceToNow(ad.created_at)}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={ad.profiles?.avatar_url || undefined} />
                <AvatarFallback>{ad.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{ad.profiles?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {safeFormatDistanceToNow(ad.created_at)}
                </p>
              </div>
            </div>
          )}
        </div>
        {!isOwner && <ContactBuyerButton wantedAd={ad} />}
      </CardFooter>
    </Card>
  );
};

export default WantedAdCard;