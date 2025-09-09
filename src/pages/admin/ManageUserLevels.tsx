import { useState, useEffect } from "react";
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
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/utils/toast";

const userLevelSchema = z.object({
  level_name: z.string().min(1, "Nome do nível é obrigatório."),
  min_transactions: z.coerce.number().int().min(0, "Mínimo de transações deve ser 0 ou mais."),
  min_avg_rating: z.coerce.number().min(0).max(5, "Avaliação mínima deve ser entre 0 e 5."),
  description: z.string().optional().nullable(),
  badge_icon: z.string().optional().nullable(),
  boost_discount_percentage: z.coerce.number().int().min(0).max(100, "Desconto deve ser entre 0 e 100."),
  priority: z.coerce.number().int().min(0, "Prioridade deve ser 0 ou mais."),
});

type UserLevelFormData = z.infer<typeof userLevelSchema>;

const fetchUserLevels = async () => {
  const { data, error } = await supabase.from("user_levels").select("*").order("priority", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const ManageUserLevelsPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<any>(null);

  const { data: userLevels, isLoading, error } = useQuery({
    queryKey: ["adminUserLevels"],
    queryFn: fetchUserLevels,
  });

  const mutation = useMutation({
    mutationFn: async (formData: { data: UserLevelFormData, level_name?: string }) => {
      const dataToSubmit = {
        ...formData.data,
        description: formData.data.description || null,
        badge_icon: formData.data.badge_icon || null,
      };

      if (formData.level_name) {
        const { error } = await supabase.from("user_levels").update(dataToSubmit).eq("level_name", formData.level_name);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_levels").insert(dataToSubmit);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUserLevels"] });
      showSuccess(`Nível de usuário ${selectedLevel ? 'atualizado' : 'criado'} com sucesso!`);
      setIsDialogOpen(false);
      setSelectedLevel(null);
    },
    onError: (err: any) => showError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (level_name: string) => {
      const { error } = await supabase.from("user_levels").delete().eq("level_name", level_name);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUserLevels"] });
      showSuccess("Nível de usuário removido com sucesso!");
    },
    onError: (err: any) => showError(err.message),
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<UserLevelFormData>({
    resolver: zodResolver(userLevelSchema),
  });

  useEffect(() => {
    if (selectedLevel) {
      reset(selectedLevel);
    } else {
      reset({
        level_name: '',
        min_transactions: 0,
        min_avg_rating: 0,
        description: '',
        badge_icon: '',
        boost_discount_percentage: 0,
        priority: 0,
      });
    }
  }, [selectedLevel, reset]);

  const handleOpenDialog = (level: any = null) => {
    setSelectedLevel(level);
    setIsDialogOpen(true);
  };

  const handleDelete = (level_name: string) => {
    deleteMutation.mutate(level_name);
  };

  const isFormDisabled = mutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gerenciar Níveis de Usuário</CardTitle>
        <Button onClick={() => handleOpenDialog()} disabled={isFormDisabled || isDeleting}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Nível
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <p className="text-destructive">Falha ao carregar níveis de usuário.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Min. Transações</TableHead>
                <TableHead>Min. Avaliação</TableHead>
                <TableHead>Desconto Boost</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userLevels?.map((level) => (
                <TableRow key={level.level_name}>
                  <TableCell className="font-medium">{level.level_name}</TableCell>
                  <TableCell>{level.min_transactions}</TableCell>
                  <TableCell>{level.min_avg_rating}</TableCell>
                  <TableCell>{level.boost_discount_percentage}%</TableCell>
                  <TableCell>{level.priority}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(level)} disabled={isFormDisabled || isDeleting}>
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
                            Esta ação não pode ser desfeita. Isso removerá permanentemente o nível de usuário "{level.level_name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(level.level_name)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
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
            <DialogTitle>{selectedLevel ? 'Editar' : 'Novo'} Nível de Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => mutation.mutate({ data, level_name: selectedLevel?.level_name }))} className="space-y-4">
            <div>
              <Label htmlFor="level_name">Nome do Nível</Label>
              <Input id="level_name" {...register("level_name")} disabled={!!selectedLevel || isFormDisabled} />
              {errors.level_name && <p className="text-destructive text-sm">{errors.level_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="min_transactions">Mínimo de Transações</Label>
              <Input id="min_transactions" type="number" {...register("min_transactions")} disabled={isFormDisabled} />
              {errors.min_transactions && <p className="text-destructive text-sm">{errors.min_transactions.message}</p>}
            </div>
            <div>
              <Label htmlFor="min_avg_rating">Avaliação Média Mínima</Label>
              <Input id="min_avg_rating" type="number" step="0.1" {...register("min_avg_rating")} disabled={isFormDisabled} />
              {errors.min_avg_rating && <p className="text-destructive text-sm">{errors.min_avg_rating.message}</p>}
            </div>
            <div>
              <Label htmlFor="boost_discount_percentage">Desconto de Impulso (%)</Label>
              <Input id="boost_discount_percentage" type="number" {...register("boost_discount_percentage")} disabled={isFormDisabled} />
              {errors.boost_discount_percentage && <p className="text-destructive text-sm">{errors.boost_discount_percentage.message}</p>}
            </div>
            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Input id="priority" type="number" {...register("priority")} disabled={isFormDisabled} />
              {errors.priority && <p className="text-destructive text-sm">{errors.priority.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea id="description" {...register("description")} disabled={isFormDisabled} />
            </div>
            <div>
              <Label htmlFor="badge_icon">Ícone da Medalha (Nome do Lucide Icon, Opcional)</Label>
              <Input id="badge_icon" {...register("badge_icon")} placeholder="Ex: Award, Star" disabled={isFormDisabled} />
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

export default ManageUserLevelsPage;