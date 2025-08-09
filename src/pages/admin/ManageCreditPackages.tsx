import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";

const packageSchema = z.object({
  amount: z.coerce.number().int().positive("A quantidade deve ser um número inteiro positivo."),
  price_in_cents: z.coerce.number().int().positive("O preço deve ser um número inteiro positivo."),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type CreditPackage = { id: string; amount: number; price_in_cents: number; description: string | null; is_active: boolean };

const fetchPackages = async () => {
  const { data, error } = await supabase.from("credit_packages").select("*").order("price_in_cents");
  if (error) throw new Error(error.message);
  return data;
};

const ManageCreditPackages = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["allCreditPackages"],
    queryFn: fetchPackages,
  });

  const form = useForm<z.infer<typeof packageSchema>>({
    resolver: zodResolver(packageSchema),
  });

  const handleOpenDialog = (pkg: CreditPackage | null = null) => {
    setEditingPackage(pkg);
    form.reset({
      amount: pkg?.amount || 0,
      price_in_cents: pkg?.price_in_cents || 0,
      description: pkg?.description || "",
      is_active: pkg?.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof packageSchema>) => {
    const toastId = showLoading(editingPackage ? "Atualizando pacote..." : "Criando pacote...");
    try {
      const { error } = editingPackage
        ? await supabase.from("credit_packages").update(values).eq("id", editingPackage.id)
        : await supabase.from("credit_packages").insert(values);
      if (error) throw new Error(error.message);

      dismissToast(toastId);
      showSuccess(`Pacote ${editingPackage ? "atualizado" : "criado"} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["allCreditPackages"] });
      queryClient.invalidateQueries({ queryKey: ["creditPackages"] }); // for the user-facing dialog
      setIsDialogOpen(false);
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  const handleDelete = async (packageId: string) => {
    const toastId = showLoading("Excluindo pacote...");
    try {
      const { error } = await supabase.from("credit_packages").delete().eq("id", packageId);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess("Pacote excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["allCreditPackages"] });
      queryClient.invalidateQueries({ queryKey: ["creditPackages"] });
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gerenciar Pacotes de Créditos</CardTitle>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Pacote
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Créditos</TableHead>
                <TableHead>Preço (R$)</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
              {packages?.map((pkg: CreditPackage) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.amount}</TableCell>
                  <TableCell>{(pkg.price_in_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell>{pkg.description}</TableCell>
                  <TableCell>{pkg.is_active ? 'Sim' : 'Não'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(pkg)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(pkg.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Editar" : "Novo"} Pacote de Créditos</DialogTitle>
            <DialogDescription>
              Configure os detalhes do pacote.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="amount">Quantidade de Créditos</Label>
              <Input id="amount" type="number" {...form.register("amount")} />
              {form.formState.errors.amount && <p className="text-red-500 text-sm">{form.formState.errors.amount.message}</p>}
            </div>
            <div>
              <Label htmlFor="price_in_cents">Preço (em centavos)</Label>
              <Input id="price_in_cents" type="number" {...form.register("price_in_cents")} />
              {form.formState.errors.price_in_cents && <p className="text-red-500 text-sm">{form.formState.errors.price_in_cents.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" {...form.register("description")} />
              {form.formState.errors.description && <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="is_active" checked={form.watch('is_active')} onCheckedChange={(checked) => form.setValue('is_active', checked)} />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ManageCreditPackages;