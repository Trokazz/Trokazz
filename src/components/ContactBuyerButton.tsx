"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { Handshake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SendMessageButton from "./SendMessageButton"; // Importar o SendMessageButton

interface ContactBuyerButtonProps {
  wantedAd: {
    id: string;
    title: string;
    user_id: string; // ID do usuário que publicou o anúncio de procura
  };
}

const ContactBuyerButton = ({ wantedAd }: ContactBuyerButtonProps) => {
  const { user } = useSession();
  const navigate = useNavigate();

  // O targetUser para o SendMessageButton será o usuário que publicou o wantedAd
  const targetUser = {
    id: wantedAd.user_id,
    full_name: "Comprador", // Nome temporário, o SendMessageButton não usa full_name para lógica
  };

  return (
    <SendMessageButton
      targetUser={targetUser}
      wantedAdId={wantedAd.id} // Passa o ID do anúncio de procura
      icon={Handshake} // Passa o ícone Handshake
    >
      Eu Tenho!
    </SendMessageButton>
  );
};

export default ContactBuyerButton;