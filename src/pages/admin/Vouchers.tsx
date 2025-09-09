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
import { showError, showSuccess } from "@/utils/toast";
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react"; // Import Trash2 and Loader2
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const promoCodeSchema = z.object({
  code: z.string().min(3, "Código é obrigatório"),
  type: z.enum(["credit_bonus", "discount_credits", "free_boost"], { required_error: "Tipo é obrigatório" }),
  value: z.coerce.number().positive("Valor deve ser positivo"),
  max_uses: z.coerce.number().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type PromoCodeFormData = z.infer<typeof promoCodeSchema>;

const fetchPromoCodes = async () => {
  const { data, error } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const VouchersPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<any>(null);

  const { data: codes, isLoading, error } = useQuery({
    queryKey: ["promoCodes"],
    queryFn: fetchPromoCodes,
  });

  const mutation = useMutation({
    mutationFn: async (formData: { data: PromoCodeFormData, id?: string }) => {
      const dataToSubmit = {
        ...formData.data,
        expires_at: formData.data.expires_at || null,
        max_uses: formData.data.max_uses || null,
      };

      if (formData.id) {
        const { error } = await supabase.from("promo_codes").update(dataToSubmit).eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promo_codes").insert(dataToSubmit);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promoCodes"] });
      showSuccess(`Voucher ${selectedCode ? 'atualizado' : 'criado'} com sucesso!`);
      setIsDialogOpen(false);
      setSelectedCode(null);
    },
    onError: (err: any) => showError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promoCodes"] });
      showSuccess("Voucher removido com sucesso!");
    },
    onError: (err: any) => showError(err.message),
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<PromoCodeFormData>({
    resolver: zodResolver(promoCodeSchema),
  });

  const onSubmit = (data: PromoCodeFormData) => {
    mutation.mutate({ data, id: selectedCode?.id });
  };

  const handleOpenDialog = (code: any = null) => {
    setSelectedCode(code);
    if (code) {
      reset({
        ...code,
        expires_at: code.expires_at ? format(new Date(code.expires_at), "yyyy-MM-dd") : null,
      });
    } else {
      reset({
        code: '',
        type: undefined,
        value: 0,
        max_uses: null,
        expires_at: null,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const isFormDisabled = mutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gerenciar Vouchers</CardTitle>
        <Button onClick={() => handleOpenDialog()} disabled={isFormDisabled || isDeleting}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Voucher
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <p className="text-destructive">Falha ao carregar vouchers.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes?.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>{code.code}</TableCell>
                  <TableCell>{code.type}</TableCell>
                  <TableCell>{code.value}</TableCell>
                  <TableCell>{code.current_uses}/{code.max_uses || '∞'}</TableCell>
                  <TableCell>{code.expires_at ? format(new Date(code.expires_at), 'dd/MM/yyyy') : 'Nunca'}</TableCell>
                  <TableCell>{code.is_active ? 'Sim' : 'Não'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(code)} disabled={isFormDisabled || isDeleting}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isFormDisabled || isDeleting}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso removerá permanentemente o voucher "{code.code}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(code.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Excluindo...
                              </>
                            ) : (
                              'Excluir'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCode ? 'Editar' : 'Novo'} Voucher</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="code">Código</Label>
              <Input id="code" {...register("code")} disabled={isFormDisabled} />
              {errors.code && <p className="text-destructive text-sm">{errors.code.message}</p>}
            </div>
            <div>
              <Label>Tipo</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_bonus">Bônus de Crédito</SelectItem>
                      <SelectItem value="discount_credits">Desconto em Créditos</SelectItem>
                      <SelectItem value="free_boost">Impulso Grátis</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-destructive text-sm">{errors.type.message}</p>}
            </div>
            <div>
              <Label htmlFor="value">Valor</Label>
              <Input id="value" type="number" {...register("value")} disabled={isFormDisabled} />
              {errors.value && <p className="text-destructive text-sm">{errors.value.message}</p>}
            </div>
            <div>
              <Label htmlFor="max_uses">Usos Máximos (opcional)</Label>
              <Input id="max_uses" type="number" {...register("max_uses")} disabled={isFormDisabled} />
            </div>
            <div>
              <Label htmlFor="expires_at">Data de Expiração (opcional)</Label>
              <Input id="expires_at" type="date" {...register("expires_at")} disabled={isFormDisabled} />
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Checkbox id="is_active" checked={field.value} onCheckedChange={field.onChange} disabled={isFormDisabled} />
                )}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isFormDisabled}>Cancelar</Button>
              <Button type="submit" disabled={isFormDisabled}>
                {isFormDisabled ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VouchersPage;