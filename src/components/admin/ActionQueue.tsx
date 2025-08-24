"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, ShieldAlert, Check, X, Eye, ShieldCheck } from "lucide-react";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import AdQuickViewDialog from "@/components/admin/AdQuickViewDialog";
import VerificationDetailsDialog from "@/components/admin/VerificationDetailsDialog"; // Importar VerificationDetailsDialog
import { useSession } from "@/contexts/SessionContext";
import { safeFormatDistanceToNow } from "@/lib/utils";
import { Json } from "@/types/supabase"; // Importar Json type

// Definir tipos localmente para ActionQueue, similar ao ModerationCenter
type AdForReview = { id: string; title: string; description: string | null; price: number; image_urls: string[]; created_at: string; category_slug: string | null; user_id: string | null; flag_reason?: string | null; profiles: { full_name: string | null; } | null; };
type VerificationRequest = { 
  id: string; 
  created_at: string; 
  user_id: string; 
  status: string; 
  submitter_full_name?: string | null; // Adicionado para exibição
};
type Report = { 
  id: string; 
  reason: string; 
  created_at: string; 
  reporter_id: string; 
  advertisements: AdForReview | null; 
  reporter_full_name?: string | null; // Adicionado para exibição
};

type ActionItem = 
  | { type: 'ad'; data: AdForReview }
  | { type: 'report'; data: Report }
  | { type: 'verification'; data: VerificationRequest }; // Adicionado tipo verification

const fetchActionQueue = async (): Promise<ActionItem[]> => {
  const adsPromise = supabase
    .from("advertisements")
    .select("*, profiles(full_name)")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true })
    .limit(3);

  const reportsPromise = supabase
    .from("reports")
    .select("id, reason, created_at, reporter_id, advertisements(id, title, profiles(full_name))") // Adicionado created_at e reporter_id
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(3);

  // NOVO: Buscar solicitações de verificação pendentes
  const verificationsPromise = supabase
    .from("verification_requests")
    .select("id, created_at, user_id, status")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(3); // Limite de 3 para a fila rápida

  const [adsResult, reportsResult, verificationsResult] = await Promise.all([adsPromise, reportsPromise, verificationsPromise]);

  if (adsResult.error) throw adsResult.error;
  if (reportsResult.error) throw reportsResult.error;
  if (verificationsResult.error) throw verificationsResult.error; // Lidar com erro para verificações

  // Buscar nomes de perfil para reports e verifications
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
      console.error("ActionQueue: Erro ao buscar perfis para reports/verifications:", profilesError);
    } else {
      fetchedProfiles.forEach(p => {
        if (p.id && p.full_name) profilesMap.set(p.id, p.full_name);
      });
    }
  }

  const ads: ActionItem[] = adsResult.data.map(item => ({ type: 'ad', data: item }));
  const reports: ActionItem[] = reportsResult.data.map(item => ({ 
    type: 'report', 
    data: { 
      ...item, 
      advertisements: item.advertisements as AdForReview | null, // Garantir tipo correto
      reporter_full_name: profilesMap.get(item.reporter_id) || null,
    }
  }));
  const verifications: ActionItem[] = verificationsResult.data.map(item => ({ 
    type: 'verification', 
    data: { 
      ...item, 
      submitter_full_name: profilesMap.get(item.user_id) || null,
    }
  }));

  const combined = [...reports, ...verifications, ...ads]; // Combinar todos os tipos
  combined.sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime()); // Ordenar por data de criação

  return combined;
};

const ActionQueue = () => {
  const queryClient = useQueryClient();
  const { user: adminUser } = useSession(); // Obter o usuário admin para ações
  const [selectedAd, setSelectedAd] = useState<AdForReview | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(null); // NOVO: Estado para verificação

  const { data: queue, isLoading } = useQuery({
    queryKey: ["actionQueue"],
    queryFn: fetchActionQueue,
    refetchInterval: 10000, // Refreshes every 10 seconds
  });

  // Add this log to see if the component re-renders and what data it has
  console.log("ActionQueue: Current queue state in render:", queue);

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

  // NOVO: Função para lidar com ações de verificação
  const handleVerificationAction = async (requestId: string, status: 'approved' | 'rejected', reason?: string) => {
    console.log(`handleVerificationAction: Processing request ${requestId} with status ${status}. Admin user: ${adminUser?.id}`);
    const toastId = showLoading("Processando solicitação...");
    try {
      const { error: requestError } = await supabase.from("verification_requests").update({ status, rejection_reason: reason, reviewed_at: new Date().toISOString(), reviewed_by: adminUser?.id }).eq("id", requestId);
      if (requestError) {
        console.error("ActionQueue: Error updating verification request status:", requestError);
        throw requestError;
      }

      await new Promise(resolve => setTimeout(resolve, 500)); // Pequeno atraso para UI

      // Buscar o user_id da solicitação para enviar a notificação ao usuário
      const { data: requestData, error: fetchRequestError } = await supabase
        .from('verification_requests')
        .select('user_id')
        .eq('id', requestId)
        .single();
      
      if (fetchRequestError || !requestData) {
        console.error("ActionQueue: Erro ao buscar user_id da solicitação de verificação:", fetchRequestError);
        throw new Error("Não foi possível encontrar o ID do usuário para notificação.");
      }
      const userIdToNotify = requestData.user_id;

      if (status === 'approved') {
        const { error: profileError } = await supabase.from("profiles").update({ is_verified: true }).eq("id", userIdToNotify);
        if (profileError) {
          console.error("ActionQueue: Error updating user profile is_verified:", profileError);
          throw profileError;
        }
        await supabase.from('notifications').insert({
            user_id: userIdToNotify,
            type: 'verification_approved',
            message: 'Sua verificação de identidade foi aprovada! Você agora é um vendedor verificado.',
            link: '/perfil?tab=verification'
        });
      } else {
        await supabase.from('notifications').insert({
            user_id: userIdToNotify,
            type: 'verification_rejected',
            message: `Sua verificação não foi aprovada. Motivo: ${reason || 'Não especificado'}. Por favor, tente novamente.`,
            link: '/perfil?tab=verification'
        });
      }

      dismissToast(toastId);
      showSuccess(`Solicitação ${status === 'approved' ? 'aprovada' : 'rejeitada'}.`);
      queryClient.invalidateQueries({ queryKey: ["actionQueue"] }); // Invalida ambas as filas
      queryClient.invalidateQueries({ queryKey: ["moderationQueue"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["verificationStatus", userIdToNotify] });
      queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
      queryClient.invalidateQueries({ queryKey: ["allUsersWithViolations"] });
      setSelectedVerificationId(null);
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

  const renderItem = (item: ActionItem) => {
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
    // NOVO: Renderização para solicitações de verificação
    if (item.type === 'verification') {
      return (
        <div key={`verification-${item.data.id}`} className="flex items-center justify-between p-2 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-semibold">Verificação de Identidade</p>
              <p className="text-xs text-muted-foreground">
                de {item.data.submitter_full_name || `Usuário ${item.data.user_id.substring(0, 4)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedVerificationId(item.data.id)}>
              <Eye className="mr-1 h-4 w-4" /> Analisar
            </Button>
          </div>
        </div>
      );
    }
    return null;
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
          {!isLoading && queue?.map(renderItem)}
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
      {/* NOVO: Diálogo de detalhes de verificação */}
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

export default ActionQueue;