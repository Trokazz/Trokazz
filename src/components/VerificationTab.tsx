import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "./ui/skeleton";
import { BadgeCheck, Clock, XCircle, ShieldCheck, FileText, Camera, CheckCircle } from "lucide-react";
import VerificationFlow from "./VerificationFlow";

const fetchVerificationStatus = async (userId: string) => {
  const { data, error } = await supabase
    .from("verification_requests")
    .select("status, rejection_reason")
    .eq("user_id", userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

const VerificationTab = () => {
  const { user } = useSession();
  const [isFlowOpen, setIsFlowOpen] = useState(false);

  const { data: verification, isLoading } = useQuery({
    queryKey: ["verificationStatus", user?.id],
    queryFn: () => fetchVerificationStatus(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (verification?.status === 'approved') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <BadgeCheck className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="mt-6 text-2xl font-bold">Verificação Concluída!</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            Você agora é um vendedor verificado. Seu selo de confiança já está visível em seu perfil.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (verification?.status === 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verificação em Análise</CardTitle>
          <CardDescription>
            Nossa equipe está validando seus documentos. Isso pode levar até 24 horas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <ul className="space-y-4">
            <li className="flex items-start gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Documentos Enviados</p>
                <p className="text-sm text-muted-foreground">Recebemos seus documentos com sucesso.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Em Análise</p>
                <p className="text-sm text-muted-foreground">Nossa equipe está revisando as informações.</p>
              </div>
            </li>
            <li className="flex items-start gap-4 opacity-50">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted-foreground/20">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Concluído</p>
                <p className="text-sm text-muted-foreground">Você será notificado sobre o resultado.</p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    );
  }
  
  if (verification?.status === 'rejected') {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-center !mt-4">Verificação não aprovada</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-muted p-3 rounded-md">
              <p className="font-semibold">Motivo da Rejeição:</p>
              <p className="text-muted-foreground">{verification.rejection_reason || "Não foi possível verificar seus documentos."}</p>
            </div>
            <Button onClick={() => setIsFlowOpen(true)} className="mt-6">
              <ShieldCheck className="mr-2 h-4 w-4" /> Tentar Novamente
            </Button>
          </CardContent>
        </Card>
        <VerificationFlow isOpen={isFlowOpen} onOpenChange={setIsFlowOpen} />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Verifique sua Identidade</CardTitle>
          <CardDescription>
            Ganhe o selo de verificado, aumente a confiança e venda mais rápido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">Documento com Foto</p>
                <p className="text-sm text-muted-foreground">RG ou CNH (frente)</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <Camera className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">Selfie com Documento</p>
                <p className="text-sm text-muted-foreground">Uma foto sua segurando o documento</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setIsFlowOpen(true)} className="mt-6 w-full">
            <ShieldCheck className="mr-2 h-4 w-4" /> Iniciar Verificação
          </Button>
        </CardContent>
      </Card>
      <VerificationFlow isOpen={isFlowOpen} onOpenChange={setIsFlowOpen} />
    </>
  );
};

export default VerificationTab;