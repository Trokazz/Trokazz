import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { safeFormatDistanceToNow, getOptimizedImageUrl } from "@/lib/utils";
import { ConversationWithDetails as FullConversationDetails } from "@/types/database"; // Importa o tipo completo
import { Database } from "@/types/supabase"; // Importa o tipo Database

// Definindo um tipo preciso para o resultado da query de mensagens
type MessageQueryResult = Pick<Database['public']['Tables']['messages']['Row'], 'content' | 'created_at' | 'is_read' | 'sender_id'>;

// Definindo um tipo preciso para o resultado da query de conversas
type ConversationQueryResult = Pick<Database['public']['Tables']['conversations']['Row'], 'id' | 'last_message_at' | 'conversation_type'> & {
  advertisements: Pick<Database['public']['Tables']['advertisements']['Row'], 'id' | 'title' | 'image_urls'> | null;
  wanted_ads: Pick<Database['public']['Tables']['wanted_ads']['Row'], 'id' | 'title'> | null;
  buyer: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null;
  seller: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null;
  messages: MessageQueryResult[];
};

const fetchConversations = async (userId: string) => {
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      id,
      last_message_at,
      conversation_type,
      advertisements ( id, title, image_urls ),
      wanted_ads ( id, title ),
      buyer:profiles!conversations_buyer_id_fkey ( id, full_name, avatar_url ),
      seller:profiles!conversations_seller_id_fkey ( id, full_name, avatar_url ),
      messages ( content, created_at, is_read, sender_id )
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false })
    .order("created_at", { foreignTable: "messages", ascending: false })
    .limit(1, { foreignTable: "messages" });

  if (error) throw error;
  return data as ConversationQueryResult[];
};

const Inbox = () => {
  const { user } = useSession();
  const { data: conversations, isLoading } = useQuery<ConversationQueryResult[]>({
    queryKey: ["conversations", user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user,
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Caixa de Entrada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
          {!isLoading && conversations?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Você não possui mensagens.</p>
          )}
          {conversations?.map((convo) => {
            const otherUser = convo.buyer?.id === user?.id ? convo.seller : convo.buyer;
            const lastMessage = convo.messages?.[0];
            const isUnread = lastMessage && !lastMessage.is_read && lastMessage.sender_id !== user?.id;

            if (!otherUser) return null;

            const adTitle = convo.conversation_type === 'ad_chat' 
              ? convo.advertisements?.title 
              : convo.wanted_ads?.title;
            
            // Obtém a URL pública da imagem do anúncio usando o caminho relativo
            const adImage = convo.conversation_type === 'ad_chat' && convo.advertisements?.image_urls?.[0]
              ? getOptimizedImageUrl(convo.advertisements.image_urls[0], { width: 64, height: 64 }, 'advertisements')
              : null;

            const adLink = convo.conversation_type === 'ad_chat' 
              ? `/anuncio/${convo.advertisements?.id}` 
              : `/procurados`; // Ou um link específico para o wanted_ad se houver

            return (
              <Link
                key={convo.id}
                to={`/chat/${convo.id}`}
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted ${isUnread ? 'bg-primary/10' : ''}`}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={getOptimizedImageUrl(otherUser.avatar_url, { width: 100, height: 100 }, 'avatars')} loading="lazy" />
                  <AvatarFallback>{getInitials(otherUser.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold truncate">{otherUser.full_name}</p>
                    <p className="text-xs text-muted-foreground flex-shrink-0">
                      {safeFormatDistanceToNow(convo.last_message_at)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {convo.conversation_type === 'ad_chat' ? "Anúncio: " : "Procura: "}
                    {adTitle || 'Indisponível'}
                  </p>
                  {lastMessage && (
                    <p className={`text-sm truncate ${isUnread ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {lastMessage.sender_id === user?.id ? "Você: " : ""}{lastMessage.content}
                    </p>
                  )}
                </div>
                {adImage && (
                  <img 
                    src={adImage} 
                    alt="Anúncio" 
                    className="w-16 h-16 object-cover rounded-md flex-shrink-0" 
                    loading="lazy"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default Inbox;