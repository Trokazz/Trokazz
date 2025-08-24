import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/utils";
import { Json } from "@/types/supabase"; // Import Json type
import { useQuery } from "@tanstack/react-query"; // Import useQuery
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// Updated VerificationRequest type to use Json for document_urls
type VerificationRequestData = {
  id: string;
  document_urls: Json | null; // Changed to Json | null
  submitter_profile: { full_name: string | null } | null; // Changed from 'profiles'
  user_id: string; // Adicionado user_id para uso na ação
};

interface VerificationDetailsDialogProps {
  requestId: string | null; // Agora recebe apenas o ID da solicitação
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (requestId: string, status: 'approved' | 'rejected', reason?: string) => void;
}

// Nova função para buscar os detalhes completos da solicitação de verificação
const fetchFullVerificationRequest = async (id: string): Promise<VerificationRequestData | null> => {
  console.log(`VerificationDetailsDialog: Fetching full verification request for ID: ${id}`);
  const { data, error } = await supabase
    .from("verification_requests")
    // Changed select statement to explicitly use the foreign key relationship
    .select("*, document_urls, submitter_profile:profiles!verification_requests_user_id_fkey(full_name)") 
    .eq("id", id)
    .single();
  
  if (error) {
    console.error("VerificationDetailsDialog: Erro ao buscar detalhes completos da verificação:", error);
    throw error;
  }
  console.log("VerificationDetailsDialog: Full verification request data received:", data);
  return data as VerificationRequestData;
};

const VerificationDetailsDialog = ({ requestId, isOpen, onOpenChange, onAction }: VerificationDetailsDialogProps) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  // Usa useQuery para buscar os detalhes completos quando o diálogo está aberto e o requestId está disponível
  const { data: requestDetails, isLoading, isError, error, refetch } = useQuery<VerificationRequestData | null>({
    queryKey: ["fullVerificationRequest", requestId],
    queryFn: () => fetchFullVerificationRequest(requestId!),
    enabled: !!requestId && isOpen, // Só executa a query se houver um ID e o diálogo estiver aberto
  });

  // Resetar o estado do diálogo quando ele é fechado
  const handleClose = (open: boolean) => {
    if (!open) {
      setRejectionReason("");
      setShowRejectionInput(false);
    }
    onOpenChange(open);
  };

  // Se não houver requestDetails (ainda carregando ou erro), mostra um skeleton ou mensagem
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Carregando Detalhes da Verificação...</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-6 py-4">
            <Skeleton className="w-full h-64" />
            <Skeleton className="w-full h-64" />
          </div>
          <DialogFooter>
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (isError || !requestDetails) {
    console.error("VerificationDetailsDialog: Error or no request details:", error);
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Erro ao Carregar Detalhes</DialogTitle>
            <DialogDescription>
              {error?.message || "Não foi possível carregar os detalhes da solicitação de verificação."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
            <Button onClick={() => refetch()}>Tentar Novamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Safely access document_urls properties
  const documentPath = (requestDetails.document_urls as { document?: string; selfie?: string } | null)?.document;
  const selfiePath = (requestDetails.document_urls as { document?: string; selfie?: string } | null)?.selfie;

  // Função para obter a URL pública direta para o link (não otimizada para exibição)
  const getDirectPublicUrl = (path: string | undefined) => {
    if (!path) return '/placeholder.svg'; // Fallback for missing path
    const { data: { publicUrl } } = supabase.storage.from("verification-documents").getPublicUrl(path);
    return publicUrl;
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert("Por favor, forneça um motivo para a rejeição.");
      return;
    }
    console.log(`VerificationDetailsDialog: Rejecting request ${requestDetails.id} with reason: ${rejectionReason}`);
    onAction(requestDetails.id, 'rejected', rejectionReason);
  };

  const handleApprove = () => {
    console.log(`VerificationDetailsDialog: Approving request ${requestDetails.id}`);
    onAction(requestDetails.id, 'approved');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Analisar Verificação de {requestDetails.submitter_profile?.full_name}</DialogTitle>
          <DialogDescription>
            Verifique se os documentos são legítimos e se correspondem.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <h3 className="font-semibold">Frente do Documento</h3>
            <a href={getDirectPublicUrl(documentPath)} target="_blank" rel="noopener noreferrer">
              <img src={getOptimizedImageUrl(documentPath, { width: 800, height: 800 }, 'verification-documents')} alt="Documento" className="w-full rounded-lg border" />
            </a>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Selfie com Documento</h3>
            <a href={getDirectPublicUrl(selfiePath)} target="_blank" rel="noopener noreferrer">
              <img src={getOptimizedImageUrl(selfiePath, { width: 800, height: 800 }, 'verification-documents')} alt="Selfie com documento" className="w-full rounded-lg border" />
            </a>
          </div>
        </div>
        {showRejectionInput && (
          <div className="space-y-2">
            <Label htmlFor="rejection_reason">Motivo da Rejeição</Label>
            <Textarea
              id="rejection_reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Foto do documento ilegível, selfie não corresponde ao documento."
            />
          </div>
        )}
        <DialogFooter>
          {!showRejectionInput ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Fechar</Button>
              <Button variant="destructive" onClick={() => setShowRejectionInput(true)}>Rejeitar</Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>Aprovar</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowRejectionInput(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleReject}>Confirmar Rejeição</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationDetailsDialog;