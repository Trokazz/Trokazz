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

const categorySchema = z.object({
  name: z.string().min(1, "O nome da categoria é obrigatório."),
  slug: z.string().min(1, "O slug é obrigatório.").regex(/^[a-z0-9-]+$/, "O slug deve conter apenas letras minúsculas, números e hífens."),
  icon: z.string().optional().nullable(),
  parent_slug: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  custom_fields: z.string().optional().nullable(), // JSON string
  connected_service_tags: z.string().optional().nullable(), // Comma-separated string
});

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

const fetchCategories = async () => {
  console.log("ManageCategories: Buscando categorias...");
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) {
    console.error("ManageCategories: Erro ao buscar categorias:", error);
    throw new Error(error.message);
  }
  console.log("ManageCategories: Categorias buscadas:", data);
  return data;
};

const ManageCategories = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
  });

  const handleOpenDialog = (category: Category | null = null) => {
    setEditingCategory(category);
    form.reset({
      name: category?.name || "",
      slug: category?.slug || "",
      icon: category?.icon || "",
      parent_slug: category?.parent_slug || "",
      image_url: category?.image_url || "",
      custom_fields: category?.custom_fields ? JSON.stringify(category.custom_fields, null, 2) : "",
      connected_service_tags: category?.connected_service_tags?.join(', ') || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof categorySchema>) => {
    setIsSubmitting(true);
    const toastId = showLoading(editingCategory ? "Atualizando categoria..." : "Criando categoria...");
    try {
      let parsedCustomFields: Database['public']['Tables']['categories']['Update']['custom_fields'] = null;
      if (values.custom_fields) {
        try {
          const trimmedCustomFields = values.custom_fields.trim();
          if (trimmedCustomFields !== "") {
            parsedCustomFields = JSON.parse(trimmedCustomFields);
            console.log("ManageCategories: Parsed custom_fields before sending to DB:", parsedCustomFields);
          } else {
            console.log("ManageCategories: custom_fields string is empty, setting to null.");
          }
        } catch (e) {
          console.error("ManageCategories: JSON parse error for custom_fields:", e);
          throw new Error("Formato JSON inválido para 'Configuração de Filtros'.");
        }
      }

      const connectedServiceTagsArray = values.connected_service_tags?.split(',').map(tag => tag.trim()).filter(Boolean) || null;

      let error;
      if (editingCategory) {
        const payload: CategoryUpdate = {
          name: values.name,
          icon: values.icon,
          parent_slug: values.parent_slug || null,
          image_url: values.image_url || null,
          custom_fields: parsedCustomFields,
          connected_service_tags: connectedServiceTagsArray,
        };
        console.log("ManageCategories: Updating category with payload:", payload);
        ({ error } = await supabase.from("categories").update(payload).eq("slug", editingCategory.slug));
      } else {
        const payload: CategoryInsert = {
          name: values.name,
          slug: values.slug,
          icon: values.icon || null,
          parent_slug: values.parent_slug || null,
          image_url: values.image_url || null,
          custom_fields: parsedCustomFields,
          connected_service_tags: connectedServiceTagsArray,
        };
        console.log("ManageCategories: Inserting category with payload:", payload);
        ({ error } = await supabase.from("categories").insert(payload));
      }
      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error("Uma categoria com este slug já existe.");
        }
        throw new Error(error.message);
      }

      dismissToast(toastId);
      showSuccess(`Categoria ${editingCategory ? "atualizada" : "criada"} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.refetchQueries({ queryKey: ["categories"] }); // Força a re-busca para garantir a atualização
      setIsDialogOpen(false);
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
      console.error("ManageCategories: Error during onSubmit:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (slug: string) => {
    const toastId = showLoading("Excluindo categoria...");
    try {
      const { error } = await supabase.from("categories").delete().eq("slug", slug);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess("Categoria excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.refetchQueries({ queryKey: ["categories"] }); // Força a re-busca para garantir a atualização
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
          <CardTitle>Gerenciar Categorias</CardTitle>
          <CardDescription>Crie e edite as categorias de anúncios do seu site.</CardDescription>
        </div>
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
                <TableHead>Categoria Pai</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
              {categories?.map((category: Category) => (
                <TableRow key={category.slug}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.slug}</TableCell>
                  <TableCell className="flex items-center gap-2">{renderIcon(category.icon)} {category.icon}</TableCell>
                  <TableCell>{category.parent_slug || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(category.slug)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && categories?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma categoria encontrada.
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
            <DialogTitle>{editingCategory ? "Editar" : "Nova"} Categoria</DialogTitle>
            <DialogDescription>
              Defina os detalhes da categoria e seus campos customizados.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Categoria</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input id="slug" {...form.register("slug")} disabled={!!editingCategory} />
              {form.formState.errors.slug && <p className="text-red-500 text-sm">{form.formState.errors.slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="icon">Ícone (Lucide)</Label>
              <Input id="icon" {...form.register("icon")} placeholder="Ex: Car, Home, Smartphone" />
              {form.formState.errors.icon && <p className="text-red-500 text-sm">{form.formState.errors.icon.message}</p>}
            </div>
            <div>
              <Label htmlFor="parent_slug">Categoria Pai (Slug)</Label>
              <Input id="parent_slug" {...form.register("parent_slug")} placeholder="Deixe em branco para categoria principal" />
              {form.formState.errors.parent_slug && <p className="text-red-500 text-sm">{form.formState.errors.parent_slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="image_url">URL da Imagem (Opcional)</Label>
              <Input id="image_url" {...form.register("image_url")} placeholder="URL para imagem de destaque da categoria" />
              {form.formState.errors.image_url && <p className="text-red-500 text-sm">{form.formState.errors.image_url.message}</p>}
            </div>
            <div>
              <Label htmlFor="connected_service_tags">Tags de Serviço Conectadas (separadas por vírgula)</Label>
              <Input id="connected_service_tags" {...form.register("connected_service_tags")} placeholder="Ex: eletricista, montador_moveis" />
              <p className="text-sm text-muted-foreground mt-1">
                Se esta categoria está relacionada a serviços (ex: "Eletrônicos" pode ter "instalador_eletronicos").
              </p>
              {form.formState.errors.connected_service_tags && <p className="text-red-500 text-sm">{form.formState.errors.connected_service_tags.message}</p>}
            </div>
            <div>
              <Label htmlFor="custom_fields">Configuração de Filtros (JSON)</Label>
              <Textarea
                id="custom_fields"
                {...form.register("custom_fields")}
                rows={10}
                className="font-mono"
                placeholder={`{\n  "hasPriceFilter": true,\n  "fields": [\n    {\n      "name": "marca",\n      "label": "Marca",\n      "type": "text"\n    }\n  ]\n}`}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Defina campos adicionais e filtros para anúncios desta categoria em formato JSON.
              </p>
              {form.formState.errors.custom_fields && <p className="text-red-500 text-sm">{form.formState.errors.custom_fields.message}</p>}
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

export default ManageCategories;