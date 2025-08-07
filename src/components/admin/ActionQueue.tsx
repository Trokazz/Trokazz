import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, ShieldAlert, Check, X, Eye } from "lucide-react";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Link } from "react-router-dom";
import { useState } from "react";
import AdQuickViewDialog from "@/components/admin/AdQuickViewDialog";

type AdForReview = { id: string; title: string; description: string | null; price: number; image_urls: string[]; created_at: string; category_slug: string | null; user_id: string | null; flag_reason?: string | null; profiles: { full_name: string | null; } | null; };

type ActionItem = 
  | { type: 'ad'; data: any }
  | { type: 'report'; data: { id: string; reason: string; advertisements: AdForReview | null } };

const fetchActionQueue = async (): Promise<ActionItem[]> => {
  const adsPromise = supabase
    .from("advertisements")
    .select("*, profiles(full_name)")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true })
    .limit(3);

  const reportsPromise = supabase
    .from("reports")
    .select("id, reason, advertisements(*, profiles(full_name))")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(3);

  const [adsResult, reportsResult] = await Promise.all([adsPromise, reportsPromise]);

  if (adsResult.error) throw adsResult.error;
  if (reportsResult.error) throw reportsResult.error;

  const ads: ActionItem[] = adsResult.data.map(item => ({ type: 'ad', data: item }));
  const reports: ActionItem[] = reportsResult.data.map(item => ({ type: 'report', data: item as any }));

  return [...reports, ...ads];
};

const ActionQueue = () => {
  const queryClient = useQueryClient();
  const [selectedAd, setSelectedAd] = useState<AdForReview | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const { data: queue, isLoading } = useQuery({
    queryKey: ["actionQueue"],
    queryFn: fetchActionQueue,
  });

  const handleAdAction = async (adId: string, newStatus: 'approved' | 'rejected') => {
    const toastId = showLoading("Atualizando status...");
    try {
      const { error } = await supabase.from("advertisements").update({ status: newStatus }).eq("id", adId);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess(`Anúncio ${newStatus === 'approved' ? 'aprovado' : 'rejeitado'}!`);
      queryClient.invalidateQueries({ queryKey: ["actionQueue"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["moderationQueue"] });
      setSelectedAd(null);
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao atualizar status.");
    }
  };

  const handleResolveReport = async (reportId: string, action: 'accept' | 'dismiss') => {
    const toastId = showLoading("Processando denúncia...");
    try {
      const { error } = await supabase.functions.invoke('resolve-report', {
        body: { reportId, action },
      });
      if (error) throw error;
      dismissToast(toastId);
      showSuccess(`Denúncia ${action === 'accept' ? 'aceita' : 'ignorada'}.`);
      queryClient.invalidateQueries({ queryKey: ["actionQueue"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["moderationQueue"] });
      setSelectedAd(null);
      setSelectedReportId(null);
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.context?.json?.error || error.message || "Erro ao processar denúncia.");
    }
  };

  const openAdDialogForReport = (report: { id: string; advertisements: AdForReview | null }) => {
    if (report.advertisements) {
      setSelectedAd(report.advertisements);
      setSelectedReportId(report.id);
    } else {
      showError("O anúncio associado a esta denúncia não foi encontrado ou foi removido.");
    }
  };

  return (
    <>
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Fila de Ações Rápidas</CardTitle>
          <CardDescription>Itens que precisam da sua atenção imediata.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          {!isLoading && queue?.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p>🎉 Fila de moderação limpa!</p>
            </div>
          )}
          {queue?.map(item => {
            if (item.type === 'ad') {
              return (
                <div key={`ad-${item.data.id}`} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Newspaper className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">{item.data.title}</p>
                      <p className="text-xs text-muted-foreground">por {item.data.profiles?.full_name || 'Desconhecido'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8 text-green-600" onClick={() => handleAdAction(item.data.id, 'approved')}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => handleAdAction(item.data.id, 'rejected')}><X className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            }
            if (item.type === 'report') {
              return (
                <div key={`report-${item.data.id}`} className="flex items-center justify-between p-2 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold">Denúncia: {item.data.advertisements?.title || 'Anúncio'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={item.data.reason}>"{item.data.reason}"</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openAdDialogForReport(item.data)}>
                      <Eye className="mr-1 h-4 w-4" /> Analisar
                    </Button>
                  </div>
                </div>
              );
            }
            return null;
          })}
          {!isLoading && queue && queue.length > 0 && (
              <Button variant="link" asChild className="w-full">
                  <Link to="/admin/moderation-center">Ver todos os itens</Link>
              </Button>
          )}
        </CardContent>
      </Card>
      <AdQuickViewDialog
        ad={selectedAd}
        reportId={selectedReportId}
        isOpen={!!selectedAd}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedAd(null);
            setSelectedReportId(null);
          }
        }}
        onUpdateAdStatus={handleAdAction}
        onResolveReport={handleResolveReport}
      />
    </>
  );
};

export default ActionQueue;