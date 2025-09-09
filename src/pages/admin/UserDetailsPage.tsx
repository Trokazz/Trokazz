import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { formatPrice } from "@/utils/formatters";
import { ArrowLeft, Edit, ExternalLink } from "lucide-react";
import BadgeDisplay from "@/components/BadgeDisplay";
import { Icon } from "@/components/IconMapper"; // Import Icon component
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fetchAdminUserDetails = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_admin_user_details', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data;
};

const AdminUserDetailsPage = () => {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: userDetails, isLoading, error } = useQuery({
    queryKey: ['adminUserDetails', userId],
    queryFn: () => fetchAdminUserDetails(userId!),
    enabled: !!userId,
  });

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

  if (error || !userDetails?.profile) {
    return (
      <div className="p-4 text-destructive text-center">
        <p>Erro ao carregar detalhes do usuário: {error?.message || "Usuário não encontrado."}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
      </div>
    );
  }

  const { profile, auth_user, ads, credits, creditTransactions, offers_made, offers_received, badges, activity_feed } = userDetails;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold">Detalhes do Usuário</h1>
        <Button asChild>
          <Link to={`/admin/users?edit=${userId}`}> {/* Link to open edit dialog in ManageUsersPage */}
            <Edit className="mr-2 h-4 w-4" /> Editar Usuário
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar_url || "/placeholder.svg"} alt={profile.full_name || "User"} loading="lazy" />
            <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl">{profile.full_name || 'N/A'}</CardTitle>
            <p className="text-muted-foreground">{profile.email || auth_user?.email || 'N/A'}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={profile.status === 'active' ? 'default' : 'destructive'}>{profile.status}</Badge>
              <Badge variant="secondary">{profile.role}</Badge>
              {profile.is_verified && <Badge className="bg-green-500 text-white">Verificado</Badge>}
            </div>
            {profile.user_level && (
              <Badge variant="outline" className="mt-1">Nível: {profile.userLevelDetails_level_name}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>ID:</strong> {profile.id}</p>
          <p><strong>Telefone:</strong> {profile.phone || 'N/A'}</p>
          <p><strong>Membro Desde:</strong> {auth_user?.created_at ? format(new Date(auth_user.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}</p>
          {badges && badges.length > 0 && (
            <div>
              <strong>Badges:</strong> <BadgeDisplay badges={badges} />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="ads">
        <TabsList className="grid w-full grid-cols-6"> {/* Adjusted grid-cols to accommodate new tab */}
          <TabsTrigger value="ads">Anúncios ({ads?.length || 0})</TabsTrigger>
          <TabsTrigger value="credits">Créditos</TabsTrigger>
          <TabsTrigger value="transactions">Transações ({creditTransactions?.length || 0})</TabsTrigger>
          <TabsTrigger value="offers-made">Ofertas Feitas ({offers_made?.length || 0})</TabsTrigger>
          <TabsTrigger value="offers-received">Ofertas Recebidas ({offers_received?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity">Atividade ({activity_feed?.length || 0})</TabsTrigger> {/* New tab */}
        </TabsList>

        <TabsContent value="ads" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Anúncios do Usuário</CardTitle></CardHeader>
            <CardContent>
              {ads && ads.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ads.map((ad: any) => (
                    <Card key={ad.id} className="p-3 flex items-center gap-3">
                      <img src={ad.image_urls?.[0] || '/placeholder.svg'} alt={ad.title} className="w-16 h-16 object-cover rounded-md" loading="lazy" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{ad.title}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(ad.price)}</p>
                        <Badge variant="secondary" className="text-xs mt-1">{ad.status}</Badge>
                      </div>
                      <Link to={`/ad/${ad.id}`} target="_blank" className="text-primary hover:underline">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">Nenhum anúncio publicado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Saldo de Créditos</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">{credits?.balance || 0} Créditos</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Histórico de Transações de Crédito</CardTitle></CardHeader>
            <CardContent>
              {creditTransactions && creditTransactions.length > 0 ? (
                <div className="space-y-2">
                  {creditTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center p-2 border rounded-md">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      <Badge variant={tx.amount > 0 ? 'default' : 'secondary'}>{tx.amount} Créditos</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">Nenhuma transação de crédito.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers-made" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Ofertas Feitas</CardTitle></CardHeader>
            <CardContent>
              {offers_made && offers_made.length > 0 ? (
                <div className="space-y-2">
                  {offers_made.map((offer: any) => (
                    <div key={offer.id} className="flex justify-between items-center p-2 border rounded-md">
                      <div>
                        <p className="font-medium">Oferta para "{offer.ad_title}"</p>
                        <p className="text-xs text-muted-foreground">Vendedor: {offer.seller_name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(offer.created_at), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(offer.offer_amount)}</p>
                        <Badge variant="secondary" className="text-xs mt-1">{offer.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">Nenhuma oferta feita.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers-received" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Ofertas Recebidas</CardTitle></CardHeader>
            <CardContent>
              {offers_received && offers_received.length > 0 ? (
                <div className="space-y-2">
                  {offers_received.map((offer: any) => (
                    <div key={offer.id} className="flex justify-between items-center p-2 border rounded-md">
                      <div>
                        <p className="font-medium">Oferta para "{offer.ad_title}"</p>
                        <p className="text-xs text-muted-foreground">Comprador: {offer.buyer_name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(offer.created_at), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(offer.offer_amount)}</p>
                        <Badge variant="secondary" className="text-xs mt-1">{offer.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">Nenhuma oferta recebida.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4"> {/* New Activity Feed Tab Content */}
          <Card>
            <CardHeader><CardTitle>Atividade Recente do Usuário</CardTitle></CardHeader>
            <CardContent>
              {activity_feed && activity_feed.length > 0 ? (
                <div className="space-y-4">
                  {activity_feed.map((activity: any, index: number) => (
                    <Link to={activity.link || '#'} key={index} className="flex items-center gap-3 hover:bg-muted/50 p-2 rounded-md transition-colors">
                      <div className="flex-shrink-0">
                        <Icon name={activity.icon} className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">Nenhuma atividade recente para este usuário.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminUserDetailsPage;