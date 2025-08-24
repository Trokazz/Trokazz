import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Wrench } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/utils"; // Import getOptimizedImageUrl

interface ConnectedServicesProps {
  tags: string[] | null;
  categoryName: string;
}

const fetchConnectedServices = async (tags: string[]) => {
  // O método `.cs` existe, mas pode não estar no tipo inferido. Converter para `any` resolve isso.
  const { data, error } = await (supabase
    .from("profiles")
    .select("id, full_name, avatar_url, username") as any)
    .cs("service_tags", tags)
    .not("username", "is", null)
    .limit(5);

  if (error) {
    console.error("Error fetching connected services:", error);
    return [];
  }
  return data;
};

const ConnectedServices = ({ tags, categoryName }: ConnectedServicesProps) => {
  const { data: services, isLoading } = useQuery({
    queryKey: ["connectedServices", tags],
    queryFn: () => fetchConnectedServices(tags!),
    enabled: !!tags && tags.length > 0,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-6 w-3/4 mb-4" />
          <div className="flex space-x-4">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <Skeleton className="h-20 w-20 rounded-lg" />
            <Skeleton className="h-20 w-20 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!services || services.length === 0) {
    return null;
  }

  return (
    <Card className="bg-muted/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Precisa de ajuda com {categoryName}?</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Confira os profissionais que podem te ajudar com a instalação, frete ou manutenção.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {services.map(profile => (
            <Link to={`/loja/${profile.username}`} key={profile.id} className="group text-center space-y-2">
              <Avatar className="h-20 w-20 mx-auto transition-transform group-hover:scale-105">
                <AvatarImage src={getOptimizedImageUrl(profile.avatar_url, { width: 64, height: 64 }, 'avatars')} />
                <AvatarFallback>{profile.full_name?.[0] || 'P'}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-medium truncate group-hover:text-primary">{profile.full_name}</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectedServices;