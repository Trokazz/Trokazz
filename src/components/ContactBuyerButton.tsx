import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useQuery } from "@tanstack/react-query";
import { Handshake } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ContactBuyerButtonProps {
  wantedAd: {
    id: string;
    title: string;
    user_id: string;
  };
}

const ContactBuyerButton = ({ wantedAd }: ContactBuyerButtonProps) => {
  const { user } = useSession();
  const navigate = useNavigate();

  // Busca o perfil do usuário atual para obter seu nome de usuário
  const { data: sellerProfile } = useQuery({
    queryKey: ['currentUserProfileForContact', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('username, full_name').eq('id', user.id).single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  const handleContact = async () => {
    if (!user) {
      showError("Você precisa estar logado para responder a uma procura.");
      navigate("/login");
      return;
    }

    if (user.id === wantedAd.user_id) {
      showError("Você não pode responder ao seu próprio anúncio de procura.");
      return;
    }

    if (!sellerProfile?.username) {
      showError("Você precisa de um nome de usuário no seu perfil para responder. Por favor, atualize seu perfil.");
      navigate("/perfil");
      return;
    }

    const toastId = showLoading("Notificando o comprador...");

    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: wantedAd.user_id,
        type: "wanted_response",
        message: `${sellerProfile.full_name || 'Alguém'} pode ter o que você procura: "${wantedAd.title}"`,
        link: `/loja/${sellerProfile.username}`,
      });

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("O comprador foi notificado! Ele pode visitar seu perfil para ver seus anúncios.");
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Não foi possível notificar o comprador.");
    }
  };

  return (
    <Button onClick={handleContact} className="w-full">
      <Handshake className="mr-2 h-4 w-4" />
      Eu Tenho!
    </Button>
  );
};

export default ContactBuyerButton;