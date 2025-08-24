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
import { Textarea } from "@/components/ui/textarea";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import * as Icons from "lucide-react"; // Importar todos os ícones Lucide
import { Database } from "@/types/supabase"; // Importar o tipo Database

const userLevelSchema = z.object({
  level_name: z.string().min(1, "O nome do nível é obrigatório."),
  description: z.string().min(1, "A descrição é obrigatória."),
  badge_icon: z.string().min(1, "O ícone é obrigatório (ex: Star, Crown)."),
  min_transactions: z.coerce.number().int().min(0, "Transações mínimas não pode ser negativo."),
  min_avg_rating: z.coerce.number().min(0, "Avaliação mínima não pode ser negativa.").max(5, "Avaliação máxima é 5."),
  boost_discount_percentage: z.coerce.number().int().min(0, "Desconto não pode ser negativo.").max(100, "Desconto máximo é 100%."),
  priority: z.coerce.number().int().min(0, "Prioridade não pode ser negativa."),
});

type UserLevel = Database['public']['Tables']['user_levels']['Row'];
type UserLevelInsert = Database['public']['Tables']['user_levels']['Insert'];
type UserLevelUpdate = Database['public']['Tables']['user_levels']['Update'];

const fetchUserLevels = async () => {
  const { data, error } = await supabase.from("user_levels").select("*").order("priority", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const ManageUserLevels = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserLevel, setEditingUserLevel] = useState<UserLevel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: userLevels, isLoading } = useQuery({
    queryKey: ["userLevels"],
    queryFn: fetchUserLevels,
  });

  const form = useForm<z.infer<typeof userLevelSchema>>({
    resolver: zodResolver(userLevelSchema),
  });

  const handleOpenDialog = (level: UserLevel | null = null) => {
    setEditingUserLevel(level);
    form.reset({
      level_name: level?.level_name || "",
      description: level?.description || "",
      badge_icon: level?.badge_icon || "",
      min_transactions: level?.min_transactions || 0,
      min_avg_rating: level?.min_avg_rating || 0,
      boost_discount_percentage: level?.boost_discount_percentage || 0,
      priority: level?.priority || 0,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof userLevelSchema>) => {
    setIsSubmitting(true);
    const toastId = showLoading(editingUserLevel ? "Atualizando nível..." : "Criando nível...");
    try {
      let error;
      if (editingUserLevel) {
        // Para atualização, level_name é a PK e não deve ser alterado
        const payload: UserLevelUpdate = {
          description: values.description,
          badge_icon: values.badge_icon,
          min_transactions: values.min_transactions,
          min_avg_rating: values.min_avg_rating,
          boost_discount_percentage: values.boost_discount_percentage,
          priority: values.priority,
        };
        ({ error } = await supabase.from("user_levels").update(payload).eq("level_name", editingUserLevel.level_name));
      } else {
        const payload: UserLevelInsert = {
          level_name: values.level_name,
          description: values.description,
          badge_icon: values.badge_icon,
          min_transactions: values.min_transactions,
          min_avg_rating: values.min_avg_rating,
          boost_discount_percentage: values.boost_discount_percentage,
          priority: values.priority,
        };
        ({ error } = await supabase.from("user_levels").insert(payload));
      }
      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error("Um nível com este nome já existe.");
        }
        throw new Error(error.message);
      }

      dismissToast(toastId);
      showSuccess(`Nível ${editingUserLevel ? "atualizado" : "criado"} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["userLevels"] });
      queryClient.invalidateQueries({ queryKey: ["publicProfile"] }); // Invalida perfis para atualizar níveis
      setIsDialogOpen(false);
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (levelName: string) => {
    const toastId = showLoading("Excluindo nível...");
    try {
      const { error } = await supabase.from("user_levels").delete().eq("level_name", levelName);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess("Nível excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["userLevels"] });
      queryClient.invalidateQueries({ queryKey: ["publicProfile"] }); // Invalida perfis para atualizar níveis
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  const renderIcon = (iconName: string | null) => {
    if (!iconName) return <Icons.HelpCircle className="h-5 w-5 text-muted-foreground" />;
    const Icon = (Icons as any)[iconName] || Icons.HelpCircle;
    return <Icon className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciar Níveis de Usuário</CardTitle>
          <CardDescription>Defina os critérios e benefícios para cada nível de reputação.</CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Nível
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nível</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Ícone</TableHead>
                <TableHead>Transações Mín.</TableHead>
                <TableHead>Avaliação Mín.</TableHead>
                <TableHead>Desconto Boost (%)</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
              {userLevels?.map((level: UserLevel) => (
                <TableRow key={level.level_name}>
                  <TableCell className="font-medium">{level.level_name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{level.description}</TableCell>
                  <TableCell className="flex items-center gap-2">{renderIcon(level.badge_icon)} {level.badge_icon}</TableCell>
                  <TableCell>{level.min_transactions}</TableCell>
                  <TableCell>{level.min_avg_rating}</TableCell>
                  <TableCell>{level.boost_discount_percentage}%</TableCell>
                  <TableCell>{level.priority}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(level)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(level.level_name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && userLevels?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhum nível de usuário encontrado.
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
            <DialogTitle>{editingUserLevel ? "Editar" : "Novo"} Nível de Usuário</DialogTitle>
            <DialogDescription>
              Defina os critérios e benefícios para este nível.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="level_name">Nome do Nível</Label>
              <Input id="level_name" {...form.register("level_name")} disabled={!!editingUserLevel} />
              {form.formState.errors.level_name && <p className="text-red-500 text-sm">{form.formState.errors.level_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...form.register("description")} rows={3} />
              {form.formState.errors.description && <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>}
            </div>
            <div>
              <Label htmlFor="badge_icon">Ícone (Lucide)</Label>
              <Input id="badge_icon" {...form.register("badge_icon")} placeholder="Ex: Star, Crown, Shield" />
              {form.formState.errors.badge_icon && <p className="text-red-500 text-sm">{form.formState.errors.badge_icon.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_transactions">Transações Mínimas</Label>
                <Input id="min_transactions" type="number" {...form.register("min_transactions", { valueAsNumber: true })} />
                {form.formState.errors.min_transactions && <p className="text-red-500 text-sm">{form.formState.errors.min_transactions.message}</p>}
              </div>
              <div>
                <Label htmlFor="min_avg_rating">Avaliação Mínima (0-5)</Label>
                <Input id="min_avg_rating" type="number" step="0.1" {...form.register("min_avg_rating", { valueAsNumber: true })} />
                {form.formState.errors.min_avg_rating && <p className="text-red-500 text-sm">{form.formState.errors.min_avg_rating.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="boost_discount_percentage">Desconto em Impulsionamento (%)</Label>
                <Input id="boost_discount_percentage" type="number" {...form.register("boost_discount_percentage", { valueAsNumber: true })} />
                {form.formState.errors.boost_discount_percentage && <p className="text-red-500 text-sm">{form.formState.errors.boost_discount_percentage.message}</p>}
              </div>
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Input id="priority" type="number" {...form.register("priority", { valueAsNumber: true })} />
                <p className="text-sm text-muted-foreground mt-1">Níveis com maior prioridade são verificados primeiro.</p>
                {form.formState.errors.priority && <p className="text-red-500 text-sm">{form.formState.errors.priority.message}</p>}
              </div>
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

export default ManageUserLevels;