import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { safeFormatDate } from "@/lib/utils";
import { Database } from "@/types/supabase";
import usePageMetadata from "@/hooks/usePageMetadata";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type CreditTransactionWithAd = Database['public']['Tables']['credit_transactions']['Row'] & {
  advertisements: Pick<Database['public']['Tables']['advertisements']['Row'], 'title'> | null;
};

const fetchCreditTransactions = async (userId: string): Promise<CreditTransactionWithAd[]> => {
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*, advertisements(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as CreditTransactionWithAd[];
};

const CreditTransactionsPage = () => {
  const { user } = useSession();
  const navigate = useNavigate();

  const { data: creditTransactions, isLoading, isError, error } = useQuery<CreditTransactionWithAd[]>({
    queryKey: ["creditTransactionsPageData", user?.id],
    queryFn: () => fetchCreditTransactions(user!.id),
    enabled: !!user,
  });

  usePageMetadata({
    title: "Histórico de Transações - Trokazz",
    description: "Visualize seu histórico de compras e usos de créditos no Trokazz.",
    keywords: "histórico de créditos, transações, créditos, trokazz",
    ogUrl: window.location.href,
  });

  const getTransactionTypeDisplay = (type: string, description: string | null, adTitle: string | null) => {
    switch (type) {
      case 'purchase': return `Compra: ${description || 'Pacote de créditos'}`;
      case 'boost_ad': return `Impulsionamento de Anúncio: ${adTitle || 'Anúncio removido'}`;
      case 'signup_bonus': return `Bônus de Cadastro: ${description || 'Primeiro anúncio'}`;
      case 'admin_add': return `Adicionado por Admin: ${description || 'Motivo não especificado'}`;
      default: return description || type;
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError) {
    return <p className="text-red-500 text-center py-4">Erro ao carregar transações: {error?.message}</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <CardTitle>Histórico de Transações de Crédito</CardTitle>
          <CardDescription>Acompanhe todas as suas compras e usos de créditos.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditTransactions && creditTransactions.length > 0 ? (
                creditTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {getTransactionTypeDisplay(transaction.type, transaction.description, transaction.advertisements?.title)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.amount > 0 ? "default" : "destructive"}>
                        {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {transaction.type === 'boost_ad' && transaction.related_ad_id ? (
                        <Link to={`/anuncio/${transaction.related_ad_id}`} target="_blank" className="hover:underline">
                          {transaction.advertisements?.title || 'Anúncio removido'}
                        </Link>
                      ) : (
                        transaction.description
                      )}
                    </TableCell>
                    <TableCell>{safeFormatDate(transaction.created_at, "dd/MM/yyyy HH:mm")}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma transação de crédito encontrada.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditTransactionsPage;