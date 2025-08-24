import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Send, ShieldCheck, FileText, Camera, Loader2 } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useQueryClient } from '@tanstack/react-query';

interface VerificationFlowProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const VerificationFlow = ({ isOpen, onOpenChange }: VerificationFlowProps) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFlow = () => {
    setStep(1);
    setDocumentFile(null);
    setSelfieFile(null);
    setIsSubmitting(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetFlow();
    }
    onOpenChange(open);
  };

  const handleSubmit = async () => {
    if (!user || !documentFile || !selfieFile) {
      showError("Ambos os documentos são necessários.");
      return;
    }
    setIsSubmitting(true);
    const toastId = showLoading("Enviando seus documentos...");

    let docPath: string | null = null;
    let selfiePath: string | null = null;

    try {
      console.log("VerificationFlow: Iniciando upload de documentos...");
      const docFileExt = documentFile.name.split('.').pop();
      docPath = `${user.id}/${Date.now()}-document.${docFileExt}`;
      const { error: docError } = await supabase.storage.from("verification-documents").upload(docPath, documentFile, { upsert: true });
      if (docError) throw new Error(`Erro no upload do documento: ${docError.message}`);
      console.log("VerificationFlow: Documento enviado para:", docPath);

      const selfieFileExt = selfieFile.name.split('.').pop();
      selfiePath = `${user.id}/${Date.now()}-selfie.${selfieFileExt}`;
      const { error: selfieError } = await supabase.storage.from("verification-documents").upload(selfiePath, selfieFile, { upsert: true });
      if (selfieError) throw new Error(`Erro no upload da selfie: ${selfieError.message}`);
      console.log("VerificationFlow: Selfie enviada para:", selfiePath);

      console.log("VerificationFlow: Inserindo solicitação de verificação no banco de dados...");
      const { data: insertData, error: insertError } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        status: 'pending',
        document_urls: { document: docPath, selfie: selfiePath }, // Armazena caminhos relativos
      }).select(); // Adicionado .select() para obter os dados inseridos

      if (insertError) {
        console.error("VerificationFlow: Supabase insert error for verification_requests:", JSON.stringify(insertError, null, 2));
        throw new Error(`Erro ao registrar solicitação: ${insertError.message || JSON.stringify(insertError)}`);
      }
      // Verifica se algum dado foi realmente retornado após a inserção
      if (!insertData || insertData.length === 0) {
          throw new Error("Falha ao registrar solicitação: Nenhum dado retornado após a inserção.");
      }
      console.log("VerificationFlow: Solicitação de verificação inserida com sucesso. Data:", insertData);

      console.log("VerificationFlow: Buscando nome do perfil para notificação...");
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const userName = profileData?.full_name || 'Um usuário';
      console.log("VerificationFlow: Nome do usuário para notificação:", userName);

      console.log("VerificationFlow: Invocando Edge Function para notificação de admin...");
      const { error: adminNotifInvokeError } = await supabase.functions.invoke('create-admin-notification', {
        body: {
          message: `${userName} enviou uma nova solicitação de verificação.`,
          link: `/admin/moderation-center`, // Link direto para a central de moderação
          type: 'new_verification',
        },
      });
      if (adminNotifInvokeError) {
        console.error('VerificationFlow: Erro ao invocar Edge Function para notificação de admin:', adminNotifInvokeError);
        // Não lança o erro, mas registra para depuração.
      }
      console.log("VerificationFlow: Edge Function de notificação de admin invocada.");

      console.log("VerificationFlow: Invalidando queries para atualização da UI...");
      queryClient.invalidateQueries({ queryKey: ["verificationStatus", user.id] });
      queryClient.invalidateQueries({ queryKey: ["moderationQueue"] }); // Invalida a fila de moderação do admin
      queryClient.invalidateQueries({ queryKey: ["adminStats"] }); // Invalida as estatísticas do admin
      console.log("VerificationFlow: Queries invalidadas.");

      dismissToast(toastId);
      showSuccess("Documentos enviados! Nossa equipe irá analisar em breve.");
      handleClose(false);
    } catch (err) {
      console.error("VerificationFlow: Erro durante o processo de envio:", err);
      // Em caso de erro, tenta remover os arquivos recém-enviados do storage
      if (docPath) await supabase.storage.from("verification-documents").remove([docPath]).catch(e => console.error("Erro ao limpar documento após falha:", e));
      if (selfiePath) await supabase.storage.from("verification-documents").remove([selfiePath]).catch(e => console.error("Erro ao limpar selfie após falha:", e));
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
    } finally {
      setIsSubmitting(false);
      console.log("VerificationFlow: Processo de envio finalizado.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Processo de Verificação</DialogTitle>
          <DialogDescription>Siga os passos para se tornar um vendedor verificado.</DialogDescription>
        </DialogHeader>
        
        {step === 1 && (
          <div className="py-4 text-center">
            <ShieldCheck className="mx-auto h-16 w-16 text-primary mb-4" />
            <h3 className="text-lg font-semibold">Como funciona?</h3>
            <p className="text-muted-foreground mt-2">Você precisará de um documento de identidade (RG ou CNH) e de uma câmera para tirar uma selfie.</p>
            <ul className="text-left list-disc list-inside mt-4 space-y-2 text-muted-foreground">
              <li>Envie uma foto nítida da frente do seu documento.</li>
              <li>Envie uma selfie segurando o mesmo documento ao lado do seu rosto.</li>
              <li>Nossa equipe analisará e aprovará sua conta.</li>
            </ul>
          </div>
        )}

        {step === 2 && (
          <div className="py-4">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <ImageUploader onFileChange={setDocumentFile} title="Frente do Documento" />
          </div>
        )}

        {step === 3 && (
          <div className="py-4">
            <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <ImageUploader onFileChange={setSelfieFile} title="Selfie com Documento" />
          </div>
        )}

        {step === 4 && (
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <h3 className="font-semibold text-center">Revise seus documentos</h3>
            <div>
              <p className="text-sm font-medium mb-2">Frente do Documento</p>
              {documentFile && <img src={URL.createObjectURL(documentFile)} alt="Documento" className="w-full rounded-lg border" />}
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Selfie com Documento</p>
              {selfieFile && <img src={URL.createObjectURL(selfieFile)} alt="Selfie" className="w-full rounded-lg border" />}
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          )}
          {step < 4 && (
            <Button onClick={() => setStep(step + 1)} disabled={(step === 2 && !documentFile) || (step === 3 && !selfieFile)}>
              Avançar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 4 && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                "Enviar para Análise"
              )}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationFlow;