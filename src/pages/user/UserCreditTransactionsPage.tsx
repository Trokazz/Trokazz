import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobilePageHeader from "@/components/MobilePageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { DollarSign, Ticket } from "lucide-react"; // Import Ticket icon
import { Button } from "@/components/ui/button"; // Import Button
import { Link } from "react-router-dom"; // Import Link

const fetchUserCreditTransactions = async (userId: string) => {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const UserCreditTransactionsPage = () => {
  const { user } = useAuth();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['userCreditTransactions', user?.id],
    queryFn: () => fetchUserCreditTransactions(user!.id),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex flex-col h-full bg-background">
        <MobilePageHeader title="Minhas Transações" />
        <main className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center text-muted-foreground pt-8">
            <DollarSign className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Faça login para ver suas transações de crédito.</p>
            <p className="mb-4">Gerencie seus créditos e vouchers em um só lugar.</p>
            <Button asChild>
              <Link to="/auth">Fazer Login</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <MobilePageHeader title="Minhas Transações" />
      <main className="flex-1 p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Transações de Crédito</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg shadow-sm">
                    <div>
                      <p className="font-semibold">{tx.description || tx.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant={tx.amount > 0 ? 'default' : 'secondary'} className={tx.amount > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} Créditos
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                <DollarSign className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">Nenhuma transação de crédito encontrada.</p>
                <p className="mb-4">Comece a comprar créditos ou resgate um voucher para ver seu histórico aqui!</p>
                <div className="flex gap-3">
                  <Button asChild>
                    <Link to="/buy-credits">
                      <DollarSign className="mr-2 h-4 w-4" /> Comprar Créditos
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/redeem">
                      <Ticket className="mr-2 h-4 w-4" /> Resgatar Voucher
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserCreditTransactionsPage;