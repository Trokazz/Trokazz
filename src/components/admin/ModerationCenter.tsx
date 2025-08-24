"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Eye, ShieldAlert, ShieldCheck, Newspaper, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { safeFormatDistanceToNow } from "@/lib/utils";
import AdQuickViewDialog from "@/components/admin/AdQuickViewDialog";
import VerificationDetailsDialog from "@/components/admin/VerificationDetailsDialog";
import { useSession } from "@/contexts/SessionContext";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Database } from "@/types/supabase";
import { Json } from "@/types/supabase";

type AdForReview = { id: string; title: string; description: string | null; price: number; image_urls: string[]; created_at: string; category_slug: string | null; user_id: string | null; flag_reason: string | null; profiles: { full_name: string | null; } | null; };
type VerificationRequest = { 
  id: string; 
  created_at: string; 
  document_urls: Json | null; 
  user_id: string; 
  status: string; 
};
type Report = { 
  id: string; 
  ad_id: string; 
  reason: string; 
  created_at: string; 
  reporter_id: string; 
  advertisements: AdForReview | null; 
};

type ModerationItem = 
  | { type: 'ad'; data: AdForReview }
  | { type: 'verification'; data: VerificationRequest & { submitter_full_name?: string | null } }
  | { type: 'report'; data: Report & { reporter_full_name?: string | null } };

const fetchModerationQueue = async (): Promise<ModerationItem[]> => {
  console.log("ModerationCenter: Iniciando fetchModerationQueue...");
  const adsPromise = supabase
    .from("advertisements")
    .select("*, profiles(full_name)")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true })
    .limit(3);

  const verificationsPromise = supabase
    .from("verification_requests")
    .select("id, created_at, user_id, status")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const reportsPromise = supabase
    .from("reports")
    .select("id, reason, created_at, reporter_id, advertisements(id, title, profiles(full_name))")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(3);

  const [adsResult, verificationsResult, reportsResult] = await Promise.all([adsPromise, verificationsPromise, reportsPromise]);

  console.log("ModerationCenter: adsResult:", adsResult);
  console.log("ModerationCenter: verificationsResult:", verificationsResult);
  console.log("ModerationCenter: reportsResult:", reportsResult);

  if (adsResult.error) {
    console.error("ModerationCenter: Erro ao buscar anúncios pendentes:", adsResult.error);
    throw adsResult.error;
  }
  if (verificationsResult.error) {
    console.error("ModerationCenter: Erro ao buscar verificações pendentes:", verificationsResult.error);
    throw verificationsResult.error;
  }
  if (reportsResult.error) {
    console.error("ModerationCenter: Erro ao buscar denúncias pendentes:", reportsResult.error);
    throw reportsResult.error;
  }

  console.log("ModerationCenter: Fetched pending verifications data:", verificationsResult.data);


  const allUserIdsToFetch = new Set<string>();
  reportsResult.data.forEach(report => {
    if (report.reporter_id) allUserIdsToFetch.add(report.reporter_id);
  });
  verificationsResult.data.forEach(verification => {
    if (verification.user_id) allUserIdsToFetch.add(verification.user_id);
  });

  let profilesMap = new Map<string, string>();
  if (allUserIdsToFetch.size > 0) {
    const { data: fetchedProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(allUserIdsToFetch));
    
    if (profilesError) {
      console.error("ModerationCenter: Erro ao buscar perfis para reports/verifications:", profilesError);
    } else {
      fetchedProfiles.forEach(p => {
        if (p.id && p.full_name) profilesMap.set(p.id, p.full_name);
      });
    }
  }

  const ads: ModerationItem[] = adsResult.data.map(item => ({ type: 'ad', data: item }));
  
  const verificationsWithProfiles: ModerationItem[] = verificationsResult.data.map(item => ({ 
    type: 'verification', 
    data: { 
      ...item, 
      document_urls: null, 
      submitter_full_name: profilesMap.get(item.user_id) || null,
    } as VerificationRequest & { submitter_full_name?: string | null }
  }));

  const reports: ModerationItem[] = reportsResult.data.map(item => ({ 
    type: 'report', 
    data: { 
      ...item, 
      reporter_full_name: profilesMap.get(item.reporter_id) || null,
    } as Report & { reporter_full_name?: string | null }
  }));

  const combined = [...reports, ...verificationsWithProfiles, ...ads];
  
  combined.sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime());

  console.log("ModerationCenter: Fila combinada final:", combined);
  console.log("ModerationCenter: Tamanho da fila combinada:", combined.length);
  return combined;
};

const ModerationCenter = () => {
  const { user: adminUser } = useSession();
  const queryClient = useQueryClient();
  const [selectedAd, setSelectedAd] = useState<AdForReview | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(null);

  const { data: queue, isLoading } = useQuery({
    queryKey: ["moderationQueue"],
    queryFn: fetchModerationQueue,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (queue) {
      console.log("ModerationCenter: Dados da fila no estado do componente:", queue);
    }
  }, [queue]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (adminUser) {
        try {
          const { data, error } = await supabase.rpc('is_admin');
          if (error) {
            console.error("ModerationCenter: Erro ao chamar is_admin() RPC:", error);
          } else {
            console.log("ModerationCenter: Resultado de is_admin() RPC:", data);
          }
        } catch (e) {
          console.error("ModerationCenter: Exceção ao chamar is_admin() RPC:", e);
        }
      }
    };
    checkAdminStatus();
  }, [adminUser]);


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
      queryClient.invalidateQueries({ queryKey: ["adminNotifications"] });
      setSelectedAd(null);
      setSelectedReportId(null);
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.context?.json?.error || error.message || "Erro ao processar denúncia.");
    }
  };

  const handleVerificationAction = async (requestId: string, status: 'approved' | 'rejected', reason?: string) => {
    console.log(`handleVerificationAction: Processing request ${requestId} with status ${status}. Admin user: ${adminUser?.id}`);
    const toastId = showLoading("Processando solicitação...");
    try {
      const { error: requestError } = await supabase.from("verification_requests").update({ status, rejection_reason: reason, reviewed_at: new Date().toISOString(), reviewed_by: adminUser?.id }).eq("id", requestId);
      if (requestError) {
        console.error("ModerationCenter: Error updating verification request status:", requestError);
        throw requestError;
      }
      console.log(`ModerationCenter: Verification request ${requestId} status updated to ${status}.`);

      // Add a small delay before invalidating and refetching
      await new Promise(resolve => setTimeout(resolve, 500));

      // Buscar o user_id da solicitação para enviar a notificação ao usuário
      const { data: requestData, error: fetchRequestError } = await supabase
        .from('verification_requests')
        .select('user_id')
        .eq('id', requestId)
        .single();
      
      if (fetchRequestError || !requestData) {
        console.error("ModerationCenter: Erro ao buscar user_id da solicitação de verificação:", fetchRequestError);
        throw new Error("Não foi possível encontrar o ID do usuário para notificação.");
      }
      const userIdToNotify = requestData.user_id;

      if (status === 'approved') {
        const { error: profileError } = await supabase.from("profiles").update({ is_verified: true }).eq("id", userIdToNotify);
        if (profileError) {
          console.error("ModerationCenter: Error updating user profile is_verified:", profileError);
          throw profileError;
        }
        console.log(`ModerationCenter: User profile ${userIdToNotify} is_verified set to true.`);
        
        await supabase.from('notifications').insert({
            user_id: userIdToNotify,
            type: 'verification_approved',
            message: 'Sua verificação de identidade foi aprovada! Você agora é um vendedor verificado.',
            link: '/perfil?tab=verification'
        });
        console.log(`ModerationCenter: User notification sent for approved verification to ${userIdToNotify}.`);
      } else {
        await supabase.from('notifications').insert({
            user_id: userIdToNotify,
            type: 'verification_rejected',
            message: `Sua verificação não foi aprovada. Motivo: ${reason || 'Não especificado'}. Por favor, tente novamente.`,
            link: '/perfil?tab=verification'
        });
        console.log(`ModerationCenter: User notification sent for rejected verification to ${userIdToNotify}.`);
      }

      dismissToast(toastId);
      showSuccess(`Solicitação ${status === 'approved' ? 'aprovada' : 'rejeitada'}.`);
      queryClient.invalidateQueries({ queryKey: ["moderationQueue"] });
      queryClient.invalidateQueries({ queryKey: ["adminNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["verificationStatus", userIdToNotify] });
      queryClient.invalidateQueries({ queryKey: ["publicProfile"] }); // Invalidate public profile to update badge
      queryClient.invalidateQueries({ queryKey: ["allUsersWithViolations"] }); // Invalidate user list in admin panel
      setSelectedVerificationId(null);
      console.log("ModerationCenter: All relevant queries invalidated after verification action.");
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
      console.error("ModerationCenter: Error during handleVerificationAction:", err);
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
                  de {item.data.submitter_full_name || `Usuário ${item.data.user_id.substring(0, 4)}`} - {safeFormatDistanceToNow(item.data.created_at)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedVerificationId(item.data.id)}><Eye className="mr-2 h-4 w-4" /> Analisar</Button>
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
                  "{item.data.reason}" por {item.data.reporter_full_name || 'Anônimo'} - {safeFormatDistanceToNow(item.data.created_at)}
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
        requestId={selectedVerificationId}
        isOpen={!!selectedVerificationId}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedVerificationId(null);
        }}
        onAction={handleVerificationAction}
      />
    </>
  );
};

export default ModerationCenter;