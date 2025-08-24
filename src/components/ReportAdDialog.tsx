import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { ShieldAlert, CheckCircle, Loader2 } from "lucide-react"; // Importar Loader2

interface ReportAdDialogProps {
  adId: string;
}

const reportReasons = [
  { value: "fraud", label: "Parece ser um golpe ou fraude." },
  { value: "prohibited_item", label: "O item anunciado é proibido na plataforma." },
  { value: "spam", label: "É um anúncio repetitivo ou spam." },
  { value: "false_info", label: "As fotos ou a descrição não correspondem ao item real." },
  { value: "other", label: "Outro motivo (descreva abaixo)." },
];

const ReportAdDialog = ({ adId }: ReportAdDialogProps) => {
  const { user } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'selection' | 'success'>('selection');
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = () => {
    setStep('selection');
    setSelectedReason("");
    setOtherReason("");
    setIsSubmitting(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    setIsOpen(open);
  };

  const handleSubmit = async () => {
    if (!user) {
      showError("Você precisa estar logado para denunciar um anúncio.");
      return;
    }
    if (!selectedReason) {
      showError("Por favor, selecione um motivo.");
      return;
    }
    
    const reasonLabel = reportReasons.find(r => r.value === selectedReason)?.label;
    const finalReason = selectedReason === "other" ? otherReason : reasonLabel;

    if (!finalReason || finalReason.trim().length < 10) {
      showError("Por favor, forneça um motivo com pelo menos 10 caracteres.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading("Enviando denúncia...");

    try {
      const { data, error } = await supabase.functions.invoke('create-report', {
        body: { adId, reason: finalReason },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error); // Handle function-specific errors

      dismissToast(toastId);
      setStep('success');
    } catch (error: any) {
      console.error("Detailed report submission error:", error);
      dismissToast(toastId);
      const functionError = error.context?.json?.error;
      showError(functionError || error.message || "Não foi possível enviar a denúncia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShieldAlert className="mr-2 h-4 w-4" />
          Denunciar
        </Button>
      </DialogTrigger>
      <DialogContent>
        {step === 'selection' && (
          <>
            <DialogHeader>
              <DialogTitle>Denunciar Anúncio</DialogTitle>
              <DialogDescription>
                Ajude-nos a manter a comunidade segura. Qual o problema com este anúncio?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                {reportReasons.map((reason) => (
                  <div key={reason.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason.value} id={reason.value} />
                    <Label htmlFor={reason.value}>{reason.label}</Label>
                  </div>
                ))}
              </RadioGroup>
              {selectedReason === "other" && (
                <Textarea
                  placeholder="Por favor, descreva o problema em detalhes."
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !selectedReason || (selectedReason === "other" && otherReason.trim().length < 10)}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  "Enviar Denúncia"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
        {step === 'success' && (
          <div className="text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <DialogTitle className="text-2xl">Denúncia Enviada</DialogTitle>
            <DialogDescription className="mt-2">
              Agradecemos sua colaboração! Nossa equipe de moderação irá analisar o anúncio o mais breve possível.
            </DialogDescription>
            <Button onClick={() => handleOpenChange(false)} className="mt-6">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportAdDialog;