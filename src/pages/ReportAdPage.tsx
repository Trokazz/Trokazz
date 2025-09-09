import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const reportReasons = [
  "Conteúdo Inadequado",
  "Golpe/Fraude",
  "Produto Falso",
  "Informações Incorretas",
  "Violação dos Termos",
  "Outro",
];

type FormData = {
  reasons: { [key: string]: boolean };
  details: string;
};

const ReportAdPage = () => {
  const { user } = useAuth();
  const { id: adId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { reasons: {}, details: "" }
  });

  const onSubmit = async (data: FormData) => {
    if (!user || !adId) {
      showError("Você precisa estar logado para denunciar.");
      return navigate('/auth');
    }
    
    const selectedReasons = Object.keys(data.reasons).filter(reason => data.reasons[reason]);

    if (selectedReasons.length === 0) {
      showError("Por favor, selecione ao menos um motivo.");
      return;
    }

    const reasonString = `${selectedReasons.join(', ')}. Detalhes: ${data.details}`;

    const { error } = await supabase.from('reports').insert({
      ad_id: adId,
      reporter_id: user.id,
      reason: reasonString,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Denúncia enviada com sucesso. Obrigado!");
      navigate(`/ad/${adId}`);
    }
  };

  return (
    <div className="bg-primary min-h-screen">
      <header className="flex items-center p-4 text-primary-foreground relative">
        <Link to={`/ad/${adId}`} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 -ml-2">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-bold text-center flex-grow">Denunciar Anúncio</h1>
      </header>
      <main className="p-4">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="rounded-2xl">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <p className="font-semibold text-foreground mb-4">Motivos predefinidos:</p>
                {reportReasons.map((reason) => (
                  <Label 
                    key={reason} 
                    htmlFor={reason} 
                    className="flex items-center justify-between p-3 rounded-lg border border-input cursor-pointer has-[:checked]:bg-primary/5 has-[:checked]:border-primary"
                  >
                    <span className="text-md">{reason}</span>
                    <Checkbox
                      id={reason}
                      {...register(`reasons.${reason}`)}
                      disabled={isSubmitting}
                      className="rounded-full"
                    />
                  </Label>
                ))}
              </div>
              <Textarea
                placeholder="Descreva o problema em detalhes..."
                {...register("details")}
                className="bg-muted/50"
                disabled={isSubmitting}
              />
              <Button type="submit" disabled={isSubmitting} className="w-full bg-accent hover:bg-accent/90 h-12 text-lg">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Denúncia'
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
};

export default ReportAdPage;