import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, PlusCircle, Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeFormatDate } from "@/lib/utils";
import { Database } from "@/types/supabase"; // Importar o tipo Database

const promoCodeSchema = z.object({
  code: z.string().min(3, "O código deve ter pelo menos 3 caracteres.").max(20, "O código deve ter no máximo 20 caracteres.").regex(/^[A-Z0-9]+$/, "Use apenas letras maiúsculas e números."),
  type: z.enum(["credit_bonus", "discount_credits", "free_boost"], {
    required_error: "Selecione o tipo de benefício.",
  }),
  value: z.coerce.number().positive("O valor deve ser positivo."),
  max_uses: z.coerce.number().int().min(0, "Usos máximos não pode ser negativo.").optional().nullable(),
  expires_at: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  description: z.string().optional().nullable(),
});

// Usando o tipo gerado pelo Supabase para garantir compatibilidade
type PromoCode = Database['public']['Tables']['promo_codes']['Row'];

const fetchPromoCodes = async () => {
  const { data, error } = await supabase.from("promo_codes").select("id, code, type, value, max_uses, current_uses, expires_at, is_active, description").order("created_at", { ascending: false }); // Otimizado aqui
  if (error) throw new Error(error.message);
  return data;
};

const ManagePromoCodes = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ["allPromoCodes"],
    queryFn: fetchPromoCodes,
  });

  const form = useForm<z.infer<typeof promoCodeSchema>>({
    resolver: zodResolver(promoCodeSchema),
  });

  const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return "";
    }
  };

  const handleOpenDialog = (code: PromoCode | null = null) => {
    setEditingPromoCode(code);
    form.reset({
      code: code?.code || "",
      type: (code?.type as "credit_bonus" | "discount_credits" | "free_boost") || "credit_bonus", // Cast para o tipo do Zod
      value: code?.value || 0,
      max_uses: code?.max_uses || null,
      expires_at: code?.expires_at ? formatDateForInput(code.expires_at) : null,
      is_active: code?.is_active ?? true,
      description: code?.description || null,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof promoCodeSchema>) => {
    setIsSubmitting(true);
    const toastId = showLoading(editingPromoCode ? "Atualizando código..." : "Criando código...");
    try {
      const payload = {
        ...values,
        code: values.code.toUpperCase(), // Ensure code is uppercase
        expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
        max_uses: values.max_uses === 0 ? null : values.max_uses, // Store 0 as NULL for unlimited
      };

      const { error } = editingPromoCode
        ? await supabase.from("promo_codes").update(payload).eq("id", editingPromoCode.id)
        : await supabase.from("promo_codes").insert(payload as Database['public']['Tables']['promo_codes']['Insert']);
      
      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error("Este código promocional já existe. Por favor, escolha outro.");
        }
        throw new Error(error.message);
      }

      dismissToast(toastId);
      showSuccess(`Código promocional ${editingPromoCode ? "atualizado" : "criado"} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["allPromoCodes"] });
      setIsDialogOpen(false);
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (codeId: string) => {
    const toastId = showLoading("Excluindo código...");
    try {
      const { error } = await supabase.from("promo_codes").delete().eq("id", codeId);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess("Código promocional excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["allPromoCodes"] });
      queryClient.invalidateQueries({ queryKey: ["creditPackages"] });
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  const getBenefitDescription = (code: PromoCode) => {
    switch (code.type) {
      case 'credit_bonus': return `${code.value} créditos bônus`;
      case 'discount_credits': return `${code.value}% de desconto em créditos`;
      case 'free_boost': return `${code.value} impulsionamento(s) grátis`;
      default: return 'Benefício desconhecido'; // Fallback para tipos não mapeados
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciar Códigos Promocionais</CardTitle>
          <CardDescription>Crie e gerencie cupons para seus usuários.</CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Código
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Benefício</TableHead>
                <TableHead>Usos (Atual/Máx)</TableHead>
                <TableHead>Expira Em</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
              {promoCodes?.map((code: PromoCode) => (
                <TableRow key={code.id}>
                  <TableCell className="font-medium">{code.code}</TableCell>
                  <TableCell>{getBenefitDescription(code)}</TableCell>
                  <TableCell>{code.current_uses} / {code.max_uses === null ? '∞' : code.max_uses}</TableCell>
                  <TableCell>{code.expires_at ? safeFormatDate(code.expires_at, "dd/MM/yy") : 'Nunca'}</TableCell>
                  <TableCell>{code.is_active ? 'Sim' : 'Não'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(code)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(code.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && promoCodes?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum código promocional encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPromoCode ? "Editar" : "Novo"} Código Promocional</DialogTitle>
            <DialogDescription>
              Configure os detalhes do código e seu benefício.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="code">Código</Label>
              <Input id="code" {...form.register("code")} disabled={!!editingPromoCode} />
              {form.formState.errors.code && <p className="text-red-500 text-sm">{form.formState.errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="type">Tipo de Benefício</Label>
              <Select onValueChange={(value) => form.setValue("type", value as "credit_bonus" | "discount_credits" | "free_boost")} value={form.watch("type")}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_bonus">Bônus de Créditos</SelectItem>
                  <SelectItem value="discount_credits">Desconto em Compra de Créditos (%)</SelectItem>
                  <SelectItem value="free_boost">Impulsionamento Grátis</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.type && <p className="text-red-500 text-sm">{form.formState.errors.type.message}</p>}
            </div>
            <div>
              <Label htmlFor="value">Valor do Benefício</Label>
              <Input id="value" type="number" step="0.01" {...form.register("value")} />
              <p className="text-sm text-muted-foreground mt-1">
                {form.watch("type") === 'credit_bonus' && 'Quantidade de créditos a adicionar.'}
                {form.watch("type") === 'discount_credits' && 'Porcentagem de desconto (ex: 10 para 10%).'}
                {form.watch("type") === 'free_boost' && 'Número de impulsionamentos gratuitos.'}
              </p>
              {form.formState.errors.value && <p className="text-red-500 text-sm">{form.formState.errors.value.message}</p>}
            </div>
            <div>
              <Label htmlFor="max_uses">Usos Máximos (Total)</Label>
              <Input id="max_uses" type="number" step="1" placeholder="Deixe em branco para ilimitado" {...form.register("max_uses")} />
              <p className="text-sm text-muted-foreground mt-1">Número total de vezes que este código pode ser usado por todos os usuários. (0 ou vazio para ilimitado)</p>
              {form.formState.errors.max_uses && <p className="text-red-500 text-sm">{form.formState.errors.max_uses.message}</p>}
            </div>
            <div>
              <Label htmlFor="expires_at">Data de Expiração</Label>
              <Input id="expires_at" type="date" {...form.register("expires_at")} value={form.watch("expires_at") || ''} />
              <p className="text-sm text-muted-foreground mt-1">Deixe em branco para nunca expirar.</p>
              {form.formState.errors.expires_at && <p className="text-red-500 text-sm">{form.formState.errors.expires_at.message}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="is_active" checked={form.watch('is_active')} onCheckedChange={(checked) => form.setValue('is_active', checked)} />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ManagePromoCodes;