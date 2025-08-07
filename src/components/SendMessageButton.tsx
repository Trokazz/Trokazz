import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { showError } from "@/utils/toast";

interface SendMessageButtonProps {
  seller: { id: string; full_name: string | null } | null;
  adId: string;
}

const SendMessageButton = ({ seller, adId }: SendMessageButtonProps) => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = async () => {
    if (!user) {
      showError("Você precisa estar logado para iniciar uma conversa.");
      return;
    }
    if (!seller || !seller.id) {
      showError("Não foi possível identificar o vendedor. Tente novamente mais tarde.");
      return;
    }
    setIsLoading(true);

    try {
      // 1. Verifica se uma conversa já existe
      let { data: existingConversation, error: selectError } = await supabase
        .from("conversations")
        .select("id")
        .eq("ad_id", adId)
        .eq("buyer_id", user.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = nenhuma linha encontrada
        throw selectError;
      }

      if (existingConversation) {
        // 2. Se existir, navega para ela
        navigate(`/chat/${existingConversation.id}`);
      } else {
        // 3. Se não, cria uma nova
        const { data: newConversation, error: insertError } = await supabase
          .from("conversations")
          .insert({
            ad_id: adId,
            buyer_id: user.id,
            seller_id: seller.id,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        if (newConversation) {
          navigate(`/chat/${newConversation.id}`);
        }
      }
    } catch (error) {
      console.error("Erro ao iniciar chat:", error);
      showError(error instanceof Error ? error.message : "Não foi possível iniciar o chat.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleStartChat} disabled={isLoading || !seller} className="w-full" size="lg">
      <MessageCircle className="mr-2 h-5 w-5" />
      {isLoading ? "Iniciando..." : "Enviar Mensagem"}
    </Button>
  );
};

export default SendMessageButton;