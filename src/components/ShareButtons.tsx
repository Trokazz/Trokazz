import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { showInfo, showError } from "@/utils/toast";

interface ShareButtonsProps {
  adTitle: string;
  adUrl: string;
}

export const ShareButtons = ({ adTitle, adUrl }: ShareButtonsProps) => {
  const shareText = `Confira este anúncio na Trokazz: ${adTitle} - ${adUrl}`;

  const handleWhatsAppShare = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleFacebookShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(adUrl)}&quote=${encodeURIComponent(adTitle)}`, '_blank');
  };

  const handleInstagramShare = () => {
    showInfo("Para compartilhar no Instagram, copie o link e cole na sua história ou postagem.");
    navigator.clipboard.writeText(adUrl).then(() => {
      window.open('https://www.instagram.com/', '_blank');
    }).catch(err => {
      console.error("Erro ao copiar link para Instagram:", err);
      showError("Não foi possível copiar o link. Por favor, copie manualmente.");
    });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: adTitle,
          text: `Confira este anúncio: ${adTitle}`,
          url: adUrl,
        });
      } catch (error) {
        console.error("Erro ao compartilhar:", error);
        showInfo("Erro ao compartilhar. Tente copiar o link.");
      }
    } else {
      navigator.clipboard.writeText(adUrl).then(() => {
        showInfo("Link do anúncio copiado para a área de transferência!");
      }).catch(err => {
        console.error("Erro ao copiar link:", err);
        showError("Não foi possível copiar o link. Por favor, copie manualmente.");
      });
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Button onClick={handleNativeShare} size="icon" className="bg-card text-card-foreground hover:bg-card/90 rounded-full h-12 w-12">
        <Share2 className="h-6 w-6" />
      </Button>
    </div>
  );
};