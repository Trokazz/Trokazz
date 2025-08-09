import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { showSuccess } from "@/utils/toast";
import { Copy, Facebook, MessageCircle } from "lucide-react";

interface ShareButtonsProps {
  title: string;
  url: string;
}

const ShareButtons = ({ title, url }: ShareButtonsProps) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(`Confira este anúncio: ${title}`);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    showSuccess("Link copiado para a área de transferência!");
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  return (
    <div className="pt-4 border-t">
        <h3 className="font-semibold mb-2">Compartilhar</h3>
        <div className="flex items-center gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button asChild variant="outline" size="icon">
                            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no WhatsApp">
                                <MessageCircle className="h-5 w-5 text-green-500" />
                            </a>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Compartilhar no WhatsApp</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button asChild variant="outline" size="icon">
                            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no Facebook">
                                <Facebook className="h-5 w-5 text-blue-600" />
                            </a>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Compartilhar no Facebook</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={handleCopy}>
                            <Copy className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Copiar Link</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    </div>
  );
};

export default ShareButtons;