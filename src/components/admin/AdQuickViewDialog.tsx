import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { User, FileText, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "../ui/skeleton";
import { getOptimizedImageUrl } from "@/lib/utils";

type AdForReview = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_urls: string[];
  created_at: string;
  category_slug: string | null;
  user_id: string | null;
  flag_reason?: string | null;
  profiles: {
    full_name: string | null;
  } | null;
};

interface AdQuickViewDialogProps {
  ad: AdForReview | null;
  reportId?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateAdStatus: (adId: string, status: 'approved' | 'rejected') => void;
  onResolveReport: (reportId: string, action: 'accept' | 'dismiss') => void;
}

const fetchSellerStats = async (userId: string | null) => {
  if (!userId) return { adCount: 0, reportCount: 0 };

  const { count: adCount, error: adError } = await supabase
    .from("advertisements")
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { data: userAds, error: userAdsError } = await supabase
    .from('advertisements')
    .select('id')
    .eq('user_id', userId);

  if (userAdsError) throw userAdsError;
  const adIds = userAds.map(ad => ad.id);

  let reportCount = 0;
  if (adIds.length > 0) {
    const { count, error: reportError } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .in('ad_id', adIds);
    if (reportError) throw reportError;
    reportCount = count || 0;
  }
    
  if (adError) {
    console.error(adError);
    return { adCount: 0, reportCount: 0 };
  }

  return { adCount, reportCount };
};

const AdQuickViewDialog = ({ ad, reportId, isOpen, onOpenChange, onUpdateAdStatus, onResolveReport }: AdQuickViewDialogProps) => {
  const { data: sellerStats, isLoading } = useQuery({
    queryKey: ["sellerStats", ad?.user_id],
    queryFn: () => fetchSellerStats(ad!.user_id),
    enabled: !!ad && !!ad.user_id,
  });

  if (!ad) return null;

  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(ad.price);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{ad.title}</DialogTitle>
          <DialogDescription>
            {reportId ? "Analisar denúncia. " : "Analisar anúncio pendente. "}
            Ações tomadas aqui são finais.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <Carousel className="w-full">
              <CarouselContent>
                {ad.image_urls.map((url, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-square w-full bg-muted rounded-lg">
                      <img src={getOptimizedImageUrl(url, { width: 600, height: 600 })} alt={`${ad.title} - Imagem ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {ad.image_urls.length > 1 && (
                <>
                  <CarouselPrevious className="absolute left-4" />
                  <CarouselNext className="absolute right-4" />
                </>
              )}
            </Carousel>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Vendedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{ad.profiles?.full_name || 'Nome não informado'}</span>
                </div>
                {isLoading ? (
                  <>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{sellerStats?.adCount} anúncios no total</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span>{sellerStats?.reportCount} denúncias recebidas</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            {ad.flag_reason && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800/50">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">Motivo da Moderação Automática</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">{ad.flag_reason}</p>
              </div>
            )}
            <div className="text-3xl font-bold text-primary">{formattedPrice}</div>
            {ad.category_slug && <Badge variant="secondary">{ad.category_slug}</Badge>}
            <div>
              <h3 className="font-semibold mb-2">Descrição</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ad.description}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {reportId ? (
            <>
              <Button variant="outline" onClick={() => onResolveReport(reportId, 'dismiss')}>Ignorar Denúncia</Button>
              <Button variant="destructive" onClick={() => onResolveReport(reportId, 'accept')}>Aceitar Denúncia</Button>
            </>
          ) : (
            <>
              <Button variant="destructive" onClick={() => onUpdateAdStatus(ad.id, 'rejected')}>Rejeitar Anúncio</Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => onUpdateAdStatus(ad.id, 'approved')}>Aprovar Anúncio</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdQuickViewDialog;