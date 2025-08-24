import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeCheck, Clock, XCircle, ShieldCheck, FileText, Camera, CheckCircle, ArrowLeft } from "lucide-react";
import VerificationFlow from "@/components/VerificationFlow";
import usePageMetadata from "@/hooks/usePageMetadata";
import { useNavigate } from "react-router-dom";

// Modificado para buscar o status is_verified do perfil e a última solicitação de verificação
const fetchVerificationData = async (userId: string) => {
  console.log(`VerificationPage: Fetching verification data for user ${userId}.`);
  // 1. Busca o status is_verified do perfil do usuário
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_verified")
    .eq("id", userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error("VerificationPage: Error fetching profile is_verified:", profileError);
    throw profileError; // PGRST116 = nenhuma linha encontrada
  }

  // 2. Busca a última solicitação de verificação
  const { data: verificationRequest, error: requestError } = await supabase
    .from("verification_requests")
    .select("status, rejection_reason")
    .eq("user_id", userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (requestError && requestError.code !== 'PGRST116') {
    console.error("VerificationPage: Error fetching latest verification request:", requestError);
    throw requestError; // PGRST116 = nenhuma linha encontrada
  }

  console.log(`VerificationPage: Profile is_verified: ${profile?.is_verified}`);
  console.log(`VerificationPage: Latest request status: ${verificationRequest?.status}`);

  return {
    isVerified: profile?.is_verified || false, // Retorna true/false do perfil
    latestRequest: verificationRequest, // Retorna a última solicitação
  };
};

const VerificationPage = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [isFlowOpen, setIsFlowOpen] = useState(false);

  const { data: verificationData, isLoading, isError, error } = useQuery({
    queryKey: ["verificationPageData", user?.id],
    queryFn: () => fetchVerificationData(user!.id),
    enabled: !!user,
  });

  usePageMetadata({
    title: "Verificação de Identidade - Trokazz",
    description: "Verifique sua identidade para ganhar o selo de vendedor verificado no Trokazz.",
    keywords: "verificação, identidade, vendedor verificado, selo de confiança, trokazz",
    ogUrl: window.location.href,
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError) {
    return <p className="text-red-500 text-center py-4">Erro ao carregar status de verificação: {error?.message}</p>;
  }

  // PASSO 1: Prioriza o status 'isVerified' do perfil
  if (verificationData?.isVerified) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle>Verificação Concluída!</CardTitle>
        </CardHeader>
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

  // PASSO 2: Se o perfil NÃO estiver verificado, verifica o status da última solicitação
  const verification = verificationData?.latestRequest;

  if (verification?.status === 'pending') {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <CardTitle>Verificação em Análise</CardTitle>
              <CardDescription>
                Nossa equipe está validando seus documentos. Isso pode levar até 24 horas.
              </CardDescription>
            </div>
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
      </>
    );
  }
  
  if (verification?.status === 'rejected') {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <CardTitle>Verificação não aprovada</CardTitle>
              <CardDescription>
                Sua solicitação de verificação foi rejeitada.
              </CardDescription>
            </div>
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

  // PASSO 3: Se não houver solicitação pendente/rejeitada e o perfil não estiver verificado, mostra o estado inicial
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <CardTitle>Verifique sua Identidade</CardTitle>
            <CardDescription>
              Ganhe o selo de verificado, aumente a confiança e venda mais rápido.
            </CardDescription>
          </div>
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

export default VerificationPage;