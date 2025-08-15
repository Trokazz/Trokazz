import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { showError } from "@/utils/toast";

interface SendMessageButtonProps {
  targetUser: { id: string; full_name: string | null } | null;
  adId?: string; // ID do anúncio de venda (opcional)
  wantedAdId?: string; // ID do anúncio de procura (opcional)
  children?: React.ReactNode; // Conteúdo do botão
}

const SendMessageButton = ({ targetUser, adId, wantedAdId, children }: SendMessageButtonProps) => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = async () => {
    if (!user) {
      showError("Você precisa estar logado para iniciar uma conversa.");
      navigate("/login");
      return;
    }
    if (!targetUser || !targetUser.id) {
      showError("Não foi possível identificar o usuário para contato. Tente novamente mais tarde.");
      return;
    }

    // Prevenir chat consigo mesmo
    if (user.id === targetUser.id) {
      showError("Você não pode iniciar uma conversa consigo mesmo.");
      return;
    }

    setIsLoading(true);

    try {
      let conversationType: 'ad_chat' | 'wanted_ad_chat';
      let queryCondition: any;
      let insertPayload: any;

      if (adId) {
        conversationType = 'ad_chat';
        queryCondition = { ad_id: adId, buyer_id: user.id };
        insertPayload = {
          ad_id: adId,
          buyer_id: user.id,
          seller_id: targetUser.id,
          conversation_type: conversationType,
        };
      } else if (wantedAdId) {
        conversationType = 'wanted_ad_chat';
        // Para wanted_ad_chat, o 'buyer' é quem fez o anúncio de procura, e o 'seller' é quem está oferecendo.
        queryCondition = { wanted_ad_id: wantedAdId, seller_id: user.id };
        insertPayload = {
          wanted_ad_id: wantedAdId,
          buyer_id: targetUser.id, // O usuário que fez o anúncio de procura
          seller_id: user.id,     // O usuário que está oferecendo (você)
          conversation_type: conversationType,
        };
      } else {
        showError("É necessário um ID de anúncio de venda ou de procura para iniciar a conversa.");
        return;
      }

      // 1. Verifica se uma conversa já existe
      let { data: existingConversation, error: selectError } = await supabase
        .from("conversations")
        .select("id")
        .match(queryCondition)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = nenhuma linha encontrada
        throw selectError;
      }

      let conversationIdToNavigate: string;

      if (existingConversation) {
        conversationIdToNavigate = existingConversation.id;
      } else {
        // 2. Se não existir, cria uma nova
        const { data: newConversation, error: insertError } = await supabase
          .from("conversations")
          .insert(insertPayload)
          .select("id")
          .single();

        if (insertError) throw insertError;
        if (!newConversation) throw new Error("Falha ao criar nova conversa.");
        conversationIdToNavigate = newConversation.id;
      }

      // 3. Navega para a conversa
      navigate(`/chat/${conversationIdToNavigate}`);

    } catch (error) {
      console.error("Erro ao iniciar chat:", error);
      showError(error instanceof Error ? error.message : "Não foi possível iniciar o chat.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleStartChat} disabled={isLoading || !targetUser} className="w-full" size="lg">
      <MessageCircle className="mr-2 h-5 w-5" />
      {isLoading ? "Iniciando..." : (children || "Enviar Mensagem")}
    </Button>
  );
};

export default SendMessageButton;