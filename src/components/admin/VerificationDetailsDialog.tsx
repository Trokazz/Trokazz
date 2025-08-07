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

type VerificationRequest = {
  id: string;
  document_urls: { document: string; selfie: string };
  profiles: { full_name: string | null } | null;
};

interface VerificationDetailsDialogProps {
  request: VerificationRequest | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (requestId: string, status: 'approved' | 'rejected', reason?: string) => void;
}

const VerificationDetailsDialog = ({ request, isOpen, onOpenChange, onAction }: VerificationDetailsDialogProps) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  if (!request) return null;

  const getPublicUrl = (path: string) => {
    return supabase.storage.from("verification-documents").getPublicUrl(path).data.publicUrl;
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert("Por favor, forneça um motivo para a rejeição.");
      return;
    }
    onAction(request.id, 'rejected', rejectionReason);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); setShowRejectionInput(false); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Analisar Verificação de {request.profiles?.full_name}</DialogTitle>
          <DialogDescription>
            Verifique se os documentos são legítimos e se correspondem.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <h3 className="font-semibold">Frente do Documento</h3>
            <a href={getPublicUrl(request.document_urls.document)} target="_blank" rel="noopener noreferrer">
              <img src={getPublicUrl(request.document_urls.document)} alt="Documento" className="w-full rounded-lg border" />
            </a>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Selfie com Documento</h3>
            <a href={getPublicUrl(request.document_urls.selfie)} target="_blank" rel="noopener noreferrer">
              <img src={getPublicUrl(request.document_urls.selfie)} alt="Selfie com documento" className="w-full rounded-lg border" />
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
              <Button variant="destructive" onClick={() => setShowRejectionInput(true)}>Rejeitar</Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => onAction(request.id, 'approved')}>Aprovar</Button>
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