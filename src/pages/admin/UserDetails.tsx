import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { safeFormatDate, safeFormatDistanceToNow, getOptimizedImageUrl } from "@/lib/utils";
import { User, Newspaper, ShieldAlert, ExternalLink, Handshake, MessagesSquare, Heart, ShieldX, PlusCircle, Ban, CheckCircle, Gem, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import AddViolationDialog from "@/components/admin/AddViolationDialog";
import SendCreditsDialog from "@/components/admin/SendCreditsDialog";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import * as Icons from "lucide-react";
import { UserLevelDetails } from "@/types/database"; // Importar UserLevelDetails

const fetchUserDetailsAndActivity = async (userId: string) => {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      *,
      userLevelDetails:user_levels ( * )
    `)
    .eq("id", userId)
    .single();
  if (profileError) throw new Error(`Erro ao buscar perfil: ${profileError.message}`);

  const { data: ads, error: adsError } = await supabase
    .from("advertisements")
    .select("id, title, price, created_at, image_urls, status, view_count, boosted_until, expires_at, last_renewed_at, metadata, latitude, longitude, flag_reason, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (adsError) throw new Error(`Erro ao buscar anúncios: ${adsError.message}`);

  const adIds = ads.map(ad => ad.id);
  let reportsAgainstUser: any[] = [];
  if (adIds.length > 0) {
    const { data: reportsData, error: reportsError } = await supabase
      .from("reports")
      .select("id, ad_id, reporter_id, reason, status, created_at, advertisements(title)")
      .in("ad_id", adIds)
      .order("created_at", { ascending: false });
    if (reportsError) throw new Error(`Erro ao buscar denúncias: ${reportsError.message}`);
    
    const reporterIds = [...new Set(reportsData.map(r => r.reporter_id))];
    if (reporterIds.length > 0) {
      const { data: reporters, error: reportersError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", reporterIds);
      if (reportersError) throw new Error(`Erro ao buscar perfis de denunciantes: ${reportersError.message}`);
      
      reportsAgainstUser = reportsData.map(report => ({
        ...report,
        reporter: reporters.find(p => p.id === report.reporter_id)
      }));
    } else {
      reportsAgainstUser = reportsData;
    }
  }

  const { data: offers, error: offersError } = await supabase
    .from("offers")
    .select("id, ad_id, buyer_id, seller_id, offer_amount, status, created_at, updated_at, advertisements(title), buyer:profiles!offers_buyer_id_fkey(full_name), seller:profiles!offers_seller_id_fkey(full_name)")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (offersError) throw new Error(`Erro ao buscar ofertas: ${offersError.message}`);

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id, ad_id, buyer_id, seller_id, conversation_type, created_at, last_message_at, wanted_ad_id, advertisements(title), buyer:profiles!conversations_buyer_id_fkey(full_name), seller:profiles!conversations_seller_id_fkey(full_name)")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });
  if (conversationsError) throw new Error(`Erro ao buscar conversas: ${conversationsError.message}`);

  const { data: favorites, error: favoritesError } = await supabase
    .from("favorites")
    .select("user_id, ad_id, created_at, advertisements(title, price)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (favoritesError) throw new Error(`Erro ao buscar favoritos: ${favoritesError.message}`);

  const { data: violationsData, error: violationsError } = await supabase
    .from("violations")
    .select("id, user_id, admin_id, reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (violationsError) throw new Error(`Erro ao buscar violações: ${violationsError.message}`);

  const adminIds = [...new Set(violationsData.map(v => v.admin_id))];
  let violations = violationsData;
  if (adminIds.length > 0) {
    const { data: admins, error: adminsError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", adminIds);
    if (adminsError) throw new Error(`Erro ao buscar perfis de admins: ${adminsError.message}`);
    
    violations = violationsData.map(violation => ({
      ...violation,
      admin: admins.find(p => p.id === violation.admin_id)
    }));
  }

  const { data: creditsData, error: creditsError } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .single();
  if (creditsError && creditsError.code !== 'PGRST116') throw new Error(`Erro ao buscar créditos: ${creditsError.message}`);

  const { data: creditTransactions, error: creditTransactionsError } = await supabase
    .from("credit_transactions")
    .select("id, user_id, amount, type, description, related_ad_id, stripe_payment_intent_id, created_at, advertisements(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (creditTransactionsError) throw new Error(`Erro ao buscar transações de crédito: ${creditTransactionsError.message}`);


  return { profile, ads, reportsAgainstUser, offers, conversations, favorites, violations, credits: creditsData || { balance: 0 }, creditTransactions };
};

const UserDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [isViolationDialogOpen, setIsViolationDialogOpen] = useState(false);
  const [isSendCreditsDialogOpen, setIsSendCreditsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["userDetails", id],
    queryFn: () => fetchUserDetailsAndActivity(id!),
    enabled: !!id,
  });

  const handleStatusUpdate = async (newStatus: 'active' | 'suspended') => {
    if (!id) return;
    const toastId = showLoading(`Alterando status para ${newStatus}...`);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess("Status do usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["userDetails", id] });
      queryClient.invalidateQueries({ queryKey: ["allUsersWithViolations"] });
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="default" className="bg-green-500">Aprovado</Badge>;
      case 'pending_approval': return <Badge variant="secondary">Pendente</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejeitado</Badge>;
      case 'sold': return <Badge variant="outline" className="border-purple-500 text-purple-500">Vendido</Badge>;
      case 'paused': return <Badge variant="outline" className="border-gray-500 text-gray-500">Pausado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOfferStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <Badge className="bg-green-500">Aceita</Badge>;
      case 'pending': return <Badge variant="secondary">Pendente</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejeitada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionTypeDisplay = (type: string, description: string | null, adTitle: string | null) => {
    switch (type) {
      case 'purchase': return `Compra: ${description || 'Pacote de créditos'}`;
      case 'boost_ad': return `Impulsionamento de Anúncio: ${adTitle || 'Anúncio removido'}`;
      case 'signup_bonus': return `Bônus de Cadastro: ${description || 'Primeiro anúncio'}`;
      case 'admin_add': return `Adicionado por Admin: ${description || 'Motivo não especificado'}`;
      default: return description || type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError) return <div className="text-center py-10 text-red-500">Erro: {error.message}</div>;

  const avatarUrl = data?.profile.avatar_url ? getOptimizedImageUrl(data.profile.avatar_url, { width: 160, height: 160 }, 'avatars') : undefined;
  // Corrigido: Cast explícito para unknown antes de UserLevelDetails
  const userLevelDetails = data?.profile.userLevelDetails as unknown as UserLevelDetails | null | undefined;
  const LevelIcon = userLevelDetails?.badge_icon ? (Icons as any)[userLevelDetails.badge_icon] || Icons.HelpCircle : Icons.User;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>{data?.profile.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{data?.profile.full_name}</CardTitle>
                <CardDescription>{data?.profile.email || 'Email não disponível'}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {data?.profile.status === 'active' ? (
                <Button onClick={() => handleStatusUpdate('suspended')} variant="outline">
                  <Ban className="mr-2 h-4 w-4" /> Suspender Conta
                </Button>
              ) : (
                <Button onClick={() => handleStatusUpdate('active')} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700">
                  <CheckCircle className="mr-2 h-4 w-4" /> Reativar Conta
                </Button>
              )}
              <Button onClick={() => setIsViolationDialogOpen(true)} variant="destructive">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Advertência
              </Button>
              <Button onClick={() => setIsSendCreditsDialogOpen(true)} variant="secondary">
                <Gem className="mr-2 h-4 w-4" /> Enviar Créditos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            {data?.profile.status === 'active' ? <CheckCircle className="h-6 w-6 text-green-500" /> : <Ban className="h-6 w-6 text-destructive" />}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{data?.profile.status === 'suspended' ? 'Suspenso' : 'Ativo'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <User className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Função</p>
              <p className="font-semibold capitalize">{data?.profile.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Newspaper className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Anúncios</p>
              <p className="font-semibold">{data?.ads.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <ShieldAlert className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Denúncias Recebidas</p>
              <p className="font-semibold">{data?.reportsAgainstUser.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Gem className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Créditos</p>
              <p className="font-semibold">{data?.credits?.balance || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <LevelIcon className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Nível do Usuário</p>
              <p className="font-semibold capitalize">{userLevelDetails?.level_name || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Star className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Reputação</p>
              <p className="font-semibold">{data?.profile.reputation_score?.toFixed(0) || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="violations">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-7">
          <TabsTrigger value="violations">Advertências</TabsTrigger>
          <TabsTrigger value="ads">Anúncios</TabsTrigger>
          <TabsTrigger value="offers">Ofertas</TabsTrigger>
          <TabsTrigger value="conversations">Conversas</TabsTrigger>
          <TabsTrigger value="favorites">Favoritos</TabsTrigger>
          <TabsTrigger value="reports">Denúncias</TabsTrigger>
          <TabsTrigger value="credit-transactions">Créditos</TabsTrigger>
        </TabsList>
        <TabsContent value="violations">
          <Card>
            <CardHeader><CardTitle>Histórico de Advertências</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Motivo</TableHead><TableHead>Aplicada por</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.violations.map((violation: any) => (
                    <TableRow key={violation.id}>
                      <TableCell className="font-medium">{violation.reason}</TableCell>
                      <TableCell>{violation.admin?.full_name || 'Admin'}</TableCell>
                      <TableCell>{safeFormatDate(violation.created_at, "dd/MM/yyyy HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                  {data?.violations.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">Nenhuma advertência encontrada.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ads">
          <Card>
            <CardHeader><CardTitle>Anúncios do Usuário</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Preço</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.ads.map(ad => (
                    <TableRow key={ad.id}>
                      <TableCell className="font-medium flex items-center gap-2">{ad.title} <Link to={`/anuncio/${ad.id}`} target="_blank"><ExternalLink className="h-4 w-4 text-muted-foreground" /></Link></TableCell>
                      <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ad.price)}</TableCell>
                      <TableCell>{getStatusBadge(ad.status)}</TableCell>
                      <TableCell>{safeFormatDate(ad.created_at, "dd/MM/yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {data?.ads.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">Nenhum anúncio encontrado.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="offers">
          <Card>
            <CardHeader><CardTitle>Ofertas Feitas e Recebidas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Anúncio</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.offers.map((offer: any) => (
                    <TableRow key={offer.id}>
                      <TableCell className="font-medium">{offer.advertisements?.title || 'N/A'}</TableCell>
                      <TableCell>{offer.buyer_id === id ? <Badge variant="outline">Enviada</Badge> : <Badge>Recebida</Badge>}</TableCell>
                      <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(offer.offer_amount)}</TableCell>
                      <TableCell>{getOfferStatusBadge(offer.status)}</TableCell>
                      <TableCell>{safeFormatDate(offer.created_at, "dd/MM/yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {data?.offers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">Nenhuma oferta encontrada.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="conversations">
          <Card>
            <CardHeader><CardTitle>Conversas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Anúncio</TableHead><TableHead>Outro Usuário</TableHead><TableHead>Última Mensagem</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.conversations.map((convo: any) => {
                    const otherUser = convo.buyer_id === id ? convo.seller : convo.buyer;
                    return (
                      <TableRow key={convo.id}>
                        <TableCell className="font-medium">{convo.advertisements?.title || 'N/A'}</TableCell>
                        <TableCell>{otherUser?.full_name || 'N/A'}</TableCell>
                        <TableCell>{safeFormatDistanceToNow(convo.last_message_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {data?.conversations.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">Nenhuma conversa encontrada.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="favorites">
          <Card>
            <CardHeader><CardTitle>Anúncios Favoritados</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Preço</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.favorites.map((fav: any) => (
                    <TableRow key={fav.ad_id}>
                      <TableCell className="font-medium flex items-center gap-2">{fav.advertisements?.title || 'N/A'} <Link to={`/anuncio/${fav.ad_id}`} target="_blank"><ExternalLink className="h-4 w-4 text-muted-foreground" /></Link></TableCell>
                      <TableCell>{fav.advertisements?.price ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fav.advertisements.price) : 'N/A'}</TableCell>
                      <TableCell>{safeFormatDate(fav.created_at, "dd/MM/yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {data?.favorites.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">Nenhum favorito encontrado.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports">
          <Card>
            <CardHeader><CardTitle>Denúncias Recebidas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Anúncio Denunciado</TableHead><TableHead>Motivo</TableHead><TableHead>Denunciado por</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.reportsAgainstUser.map(report => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium flex items-center gap-2">{report.advertisements?.title || 'Anúncio removido'} <Link to={`/anuncio/${report.ad_id}`} target="_blank"><ExternalLink className="h-4 w-4 text-muted-foreground" /></Link></TableCell>
                      <TableCell>{report.reason}</TableCell>
                      <TableCell>{report.reporter?.full_name || 'Anônimo'}</TableCell>
                      <TableCell>{safeFormatDate(report.created_at, "dd/MM/yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {data?.reportsAgainstUser.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">Nenhuma denúncia recebida.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="credit-transactions">
          <Card>
            <CardHeader><CardTitle>Histórico de Transações de Crédito</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Créditos</TableHead><TableHead>Descrição</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.creditTransactions.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {getTransactionTypeDisplay(transaction.type, transaction.description, transaction.advertisements?.title)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.amount > 0 ? "default" : "destructive"}>
                          {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.type === 'boost_ad' && transaction.related_ad_id ? (
                          <Link to={`/anuncio/${transaction.related_ad_id}`} target="_blank" className="hover:underline">
                            {transaction.advertisements?.title || 'Anúncio removido'}
                          </Link>
                        ) : (
                          transaction.description
                        )}
                      </TableCell>
                      <TableCell>{safeFormatDate(transaction.created_at, "dd/MM/yyyy HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                  {data?.creditTransactions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">Nenhuma transação de crédito encontrada.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {id && <AddViolationDialog userId={id} isOpen={isViolationDialogOpen} onOpenChange={setIsViolationDialogOpen} />}
      {id && data?.profile?.full_name && (
        <SendCreditsDialog
          userId={id}
          userName={data.profile.full_name}
          isOpen={isSendCreditsDialogOpen}
          onOpenChange={setIsSendCreditsDialogOpen}
        />
      )}
    </div>
  );
};

export default UserDetails;