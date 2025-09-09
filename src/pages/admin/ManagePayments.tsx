import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { PlusCircle, DollarSign, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/utils/formatters"; // Importando formatPrice

const addCreditsSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido."),
  amount: z.coerce.number().int().positive("A quantidade deve ser um número inteiro positivo."),
  description: z.string().min(5, "A descrição deve ter pelo menos 5 caracteres."),
});

type AddCreditsFormData = z.infer<typeof addCreditsSchema>;

const fetchTransactions = async () => {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*, profiles:user_id(full_name, email)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const fetchUsersForSelect = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .order('full_name', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const ManagePaymentsPage = () => {
  const queryClient = useQueryClient();
  const { user: adminUser } = useAuth();
  const [isAddCreditsDialogOpen, setIsAddCreditsDialogOpen] = useState(false);

  const { data: transactions, isLoading: isLoadingTransactions, error: transactionsError } = useQuery({
    queryKey: ['adminTransactions'],
    queryFn: fetchTransactions,
  });

  const { data: usersForSelect, isLoading: isLoadingUsersForSelect, error: usersForSelectError } = useQuery({
    queryKey: ['usersForCreditSelect'],
    queryFn: fetchUsersForSelect,
  });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<AddCreditsFormData>({
    resolver: zodResolver(addCreditsSchema),
  });

  const addCreditsMutation = useMutation({
    mutationFn: async (data: AddCreditsFormData) => {
      if (!adminUser) throw new Error("Administrador não autenticado.");
      const { error } = await supabase.rpc('add_credits_by_admin', {
        p_user_id: data.userId,
        p_amount: data.amount,
        p_description: data.description,
        p_admin_id: adminUser.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['userCredits'] }); // Invalidate user's credit balance
      showSuccess("Créditos adicionados com sucesso!");
      setIsAddCreditsDialogOpen(false);
      reset();
    },
    onError: (err: any) => showError(err.message),
  });

  const onSubmitAddCredits = (data: AddCreditsFormData) => {
    addCreditsMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Histórico de Transações de Crédito</CardTitle>
        <Button onClick={() => setIsAddCreditsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Créditos
        </Button>
      </CardHeader>
      <CardContent>
        {isLoadingTransactions ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : transactionsError ? (
          <p className="text-destructive">Falha ao carregar transações.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{(tx.profiles as any)?.full_name || 'N/A'}</TableCell>
                  <TableCell>{(tx.profiles as any)?.email}</TableCell>
                  <TableCell>{tx.type}</TableCell>
                  <TableCell>{tx.amount}</TableCell>
                  <TableCell>{format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{tx.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isAddCreditsDialogOpen} onOpenChange={setIsAddCreditsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Créditos Manualmente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitAddCredits)} className="space-y-4">
            <div>
              <Label htmlFor="userId">Usuário</Label>
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingUsersForSelect}>
                    <SelectTrigger id="userId">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingUsersForSelect ? (
                        <SelectItem value="loading" disabled>Carregando usuários...</SelectItem>
                      ) : usersForSelectError ? (
                        <SelectItem value="error" disabled>Erro ao carregar usuários</SelectItem>
                      ) : (
                        usersForSelect?.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name} ({u.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.userId && <p className="text-destructive text-sm">{errors.userId.message}</p>}
            </div>
            <div>
              <Label htmlFor="amount">Quantidade de Créditos</Label>
              <Input id="amount" type="number" {...register("amount")} />
              {errors.amount && <p className="text-destructive text-sm">{errors.amount.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...register("description")} />
              {errors.description && <p className="text-destructive text-sm">{errors.description.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddCreditsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={addCreditsMutation.isPending || isSubmitting}>
                {addCreditsMutation.isPending || isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Adicionar Créditos
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ManagePaymentsPage;