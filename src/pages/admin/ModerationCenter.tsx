import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Eye, ShieldAlert, ShieldCheck, Newspaper, CheckCircle } from "lucide-react";
import { useState } from "react";
import { safeFormatDistanceToNow } from "@/lib/utils";
import AdQuickViewDialog from "@/components/admin/AdQuickViewDialog";
import VerificationDetailsDialog from "@/components/admin/VerificationDetailsDialog";
import { useSession } from "@/contexts/SessionContext";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";

type AdForReview = { id: string; title: string; description: string | null; price: number; image_urls: string[]; created_at: string; category_slug: string | null; user_id: string | null; flag_reason: string | null; profiles: { full_name: string | null; } | null; };
type VerificationRequest = { id: string; created_at: string; document_urls: { document: string; selfie: string }; profiles: { full_name: string | null } | null; user_id: string; };
type Report = { id: string; ad_id: string; reason: string; created_at: string; advertisements: AdForReview | null; profiles: { full_name: string | null } | null; };

type ModerationItem = 
  | { type: 'ad'; data: AdForReview }
  | { type: 'verification'; data: VerificationRequest }
  | { type: 'report'; data: Report };

const fetchModerationQueue = async (): Promise<ModerationItem[]> => {
  const adsPromise = supabase
    .from("advertisements")
    .select("*, profiles(full_name)")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  const verificationsPromise = supabase
    .from("verification_requests")
    .select("*, profiles(full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const reportsPromise = supabase
    .from("reports")
    .select("id, reason, created_at, reporter_id, advertisements(*, profiles(full_name)), profiles(full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const [adsResult, verificationsResult, reportsResult] = await Promise.all([adsPromise, verificationsPromise, reportsPromise]);

  if (adsResult.error) throw adsResult.error;
  if (verificationsResult.error) throw verificationsResult.error;
  if (reportsResult.error) throw reportsResult.error;

  const ads: ModerationItem[] = adsResult.data.map(item => ({ type: 'ad', data: item }));
  const verifications: ModerationItem[] = verificationsResult.data.map(item => ({ type: 'verification', data: item as any }));
  const reports: ModerationItem[] = reportsResult.data.map(item => ({ type: 'report', data: item as any }));

  const combined = [...reports, ...verifications, ...ads];
  
  combined.sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime());

  return combined;
};

const ModerationCenter = () => {
  const { user: adminUser } = useSession();
  const queryClient = useQueryClient();
  const [selectedAd, setSelectedAd] = useState<AdForReview | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedVerification, setSelectedVerification] = useState<VerificationRequest | null>(null);

  const { data: queue, isLoading } = useQuery({
    queryKey: ["moderationQueue"],
    queryFn: fetchModerationQueue,
  });

  const handleAdAction = async (adId: string, newStatus: 'approved' | 'rejected') => {
    const toastId = showLoading("Atualizando status...");
    try {
      const { error } = await supabase.from("advertisements").update({ status: newStatus }).eq("id", adId);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess(`Anúncio ${newStatus === 'approved' ? 'aprovado' : 'rejeitado'}!`);
      queryClient.invalidateQueries({ queryKey: ["moderationQueue"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
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
      queryClient.invalidateQueries({ queryKey: ["moderationQueue"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setSelectedAd(null);
      setSelectedReportId(null);
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.context?.json?.error || error.message || "Erro ao processar denúncia.");
    }
  };

  const handleVerificationAction = async (requestId: string, status: 'approved' | 'rejected', reason?: string) => {
    const toastId = showLoading("Processando solicitação...");
    try {
      const requestItem = queue?.find(item => item.type === 'verification' && item.data.id === requestId);
      if (!requestItem) throw new Error("Solicitação não encontrada na fila.");
      const request = requestItem.data as VerificationRequest;

      const { error: requestError } = await supabase.from("verification_requests").update({ status, rejection_reason: reason, reviewed_at: new Date().toISOString(), reviewed_by: adminUser?.id }).eq("id", requestId);
      if (requestError) throw requestError;

      if (status === 'approved') {
        const { error: profileError } = await supabase.from("profiles").update({ is_verified: true }).eq("id", request.user_id);
        if (profileError) throw profileError;
        
        await supabase.from('notifications').insert({
            user_id: request.user_id,
            type: 'verification_approved',
            message: 'Sua verificação de identidade foi aprovada! Você agora é um vendedor verificado.',
            link: '/perfil?tab=verification'
        });
      } else {
        await supabase.from('notifications').insert({
            user_id: request.user_id,
            type: 'verification_rejected',
            message: `Sua verificação não foi aprovada. Motivo: ${reason || 'Não especificado'}. Por favor, tente novamente.`,
            link: '/perfil?tab=verification'
        });
      }

      dismissToast(toastId);
      showSuccess(`Solicitação ${status === 'approved' ? 'aprovada' : 'rejeitada'}.`);
      queryClient.invalidateQueries({ queryKey: ["moderationQueue"] });
      setSelectedVerification(null);
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  const openAdDialogForReport = (report: Report) => {
    if (report.advertisements) {
      setSelectedAd(report.advertisements);
      setSelectedReportId(report.id);
    } else {
      showError("O anúncio associado a esta denúncia não foi encontrado ou foi removido.");
    }
  };

  const renderItem = (item: ModerationItem) => {
    switch (item.type) {
      case 'ad':
        return (
          <div key={item.data.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Newspaper className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Novo Anúncio: <span className="font-normal">{item.data.title}</span></p>
                <p className="text-sm text-muted-foreground">
                  por {item.data.profiles?.full_name || 'Desconhecido'} - {safeFormatDistanceToNow(item.data.created_at)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedAd(item.data)}><Eye className="mr-2 h-4 w-4" /> Analisar</Button>
          </div>
        );
      case 'verification':
        return (
          <div key={item.data.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-semibold">Solicitação de Verificação</p>
                <p className="text-sm text-muted-foreground">
                  de {item.data.profiles?.full_name || 'Desconhecido'} - {safeFormatDistanceToNow(item.data.created_at)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedVerification(item.data)}><Eye className="mr-2 h-4 w-4" /> Analisar</Button>
          </div>
        );
      case 'report':
        return (
          <div key={item.data.id} className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold">Denúncia: {item.data.advertisements?.title}</p>
                <p className="text-sm text-muted-foreground truncate max-w-xs" title={item.data.reason}>
                  "{item.data.reason}" por {item.data.profiles?.full_name || 'Anônimo'} - {safeFormatDistanceToNow(item.data.created_at)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => openAdDialogForReport(item.data)}><Eye className="mr-2 h-4 w-4" /> Analisar Denúncia</Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Central de Moderação</CardTitle>
          <CardDescription>
            Analise e aprove conteúdos, denúncias e verificações em um só lugar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          {!isLoading && queue?.length === 0 && (
            <div className="text-center py-10">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold">Tudo em ordem!</h3>
              <p className="text-muted-foreground">Não há itens pendentes na fila de moderação.</p>
            </div>
          )}
          {!isLoading && queue?.map(renderItem)}
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
      <VerificationDetailsDialog
        request={selectedVerification}
        isOpen={!!selectedVerification}
        onOpenChange={(isOpen) => !isOpen && setSelectedVerification(null)}
        onAction={handleVerificationAction}
      />
    </>
  );
};

export default ModerationCenter;