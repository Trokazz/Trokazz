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
import { Textarea } from "@/components/ui/textarea";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";

const categorySchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  slug: z.string().min(1, "O slug é obrigatório."),
  icon: z.string().min(1, "O ícone é obrigatório (ex: Car, Home)."),
  custom_fields: z.string().optional().refine(val => {
    if (!val || val.trim() === '') return true;
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: "O JSON dos campos customizados é inválido." }),
  connected_service_tags: z.string().optional(),
});

type Category = { id: string; name: string; slug: string; icon: string; custom_fields: any; connected_service_tags: string[] | null };

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const ManageCategories = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["allCategories"],
    queryFn: fetchCategories,
  });

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
  });

  const handleOpenDialog = (category: Category | null = null) => {
    setEditingCategory(category);
    form.reset({
      name: category ? category.name : "",
      slug: category ? category.slug : "",
      icon: category ? category.icon : "",
      custom_fields: category && category.custom_fields ? JSON.stringify(category.custom_fields, null, 2) : "",
      connected_service_tags: category?.connected_service_tags?.join(', ') || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof categorySchema>) => {
    const toastId = showLoading(editingCategory ? "Atualizando categoria..." : "Criando categoria...");
    try {
      const customFields = values.custom_fields && values.custom_fields.trim() !== '' ? JSON.parse(values.custom_fields) : null;
      const serviceTagsArray = values.connected_service_tags?.split(',').map(tag => tag.trim()).filter(Boolean) || null;
      
      const payload = {
        name: values.name,
        slug: values.slug,
        icon: values.icon,
        custom_fields: customFields,
        connected_service_tags: serviceTagsArray,
      };

      let error;
      if (editingCategory) {
        ({ error } = await supabase.from("categories").update(payload).eq("id", editingCategory.id));
      } else {
        ({ error } = await supabase.from("categories").insert(payload));
      }
      if (error) throw new Error(error.message);

      dismissToast(toastId);
      showSuccess(`Categoria ${editingCategory ? "atualizada" : "criada"} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["allCategories"] });
      setIsDialogOpen(false);
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  const handleDelete = async (categoryId: string) => {
    const toastId = showLoading("Excluindo categoria...");
    try {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess("Categoria excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["allCategories"] });
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gerenciar Categorias</CardTitle>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Ícone</TableHead>
                <TableHead>Tags de Serviço</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                </TableRow>
              ))}
              {categories?.map((cat: Category) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>{cat.slug}</TableCell>
                  <TableCell>{cat.icon}</TableCell>
                  <TableCell>{cat.connected_service_tags?.join(', ')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cat.id)}>
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
            <DialogTitle>{editingCategory ? "Editar" : "Nova"} Categoria</DialogTitle>
            <DialogDescription>
              Configure os detalhes e conexões da categoria.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...form.register("slug")} />
              {form.formState.errors.slug && <p className="text-red-500 text-sm">{form.formState.errors.slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="icon">Ícone (Lucide)</Label>
              <Input id="icon" {...form.register("icon")} />
              {form.formState.errors.icon && <p className="text-red-500 text-sm">{form.formState.errors.icon.message}</p>}
            </div>
            <div>
              <Label htmlFor="connected_service_tags">Tags de Serviços Conectados</Label>
              <Input id="connected_service_tags" {...form.register("connected_service_tags")} placeholder="Ex: montador_moveis, frete" />
              <p className="text-sm text-muted-foreground mt-1">Separe as tags por vírgula.</p>
            </div>
            <div>
              <Label htmlFor="custom_fields">Configuração de Filtros (JSON)</Label>
              <Textarea
                id="custom_fields"
                {...form.register("custom_fields")}
                rows={8}
                placeholder={`{
  "hasPriceFilter": false,
  "fields": [
    {
      "name": "tipo",
      "label": "Tipo",
      "type": "select",
      "options": ["Doação", "Troca", "Achado", "Perdido"]
    }
  ]
}`}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Use <span className="font-mono">"hasPriceFilter": false</span> para remover o preço. Tipos de campo: 'text', 'number', 'select'.
              </p>
              {form.formState.errors.custom_fields && <p className="text-red-500 text-sm">{form.formState.errors.custom_fields.message}</p>}
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

export default ManageCategories;