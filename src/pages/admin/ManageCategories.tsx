import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUploader from "@/components/ImageUploader"; // Importar ImageUploader
import { getRelativePathFromUrlOrPath } from "@/lib/utils"; // Importar getRelativePathFromUrlOrPath

const categorySchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  slug: z.string().min(1, "O slug é obrigatório."),
  icon: z.string().min(1, "O ícone é obrigatório (ex: Car, Home)."),
  parent_slug: z.string().nullable().optional(),
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
  image: z.instanceof(File).nullable().optional(), // Novo campo para a imagem
});

type Category = { id: string; name: string; slug: string; icon: string; custom_fields: any; connected_service_tags: string[] | null; parent_slug: string | null; image_url: string | null };

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("id, name, slug, parent_slug, icon, connected_service_tags, custom_fields, image_url").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const ManageCategories = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null); // Para exibir a imagem atual no uploader

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
      parent_slug: category ? category.parent_slug : null,
      custom_fields: category && category.custom_fields ? JSON.stringify(category.custom_fields, null, 2) : "",
      connected_service_tags: category?.connected_service_tags?.join(', ') || "",
      image: null, // Resetar o campo de arquivo
    });
    setCurrentImageUrl(category?.image_url || null); // Definir a URL da imagem atual
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof categorySchema>) => {
    setIsSubmitting(true);
    const toastId = showLoading(editingCategory ? "Atualizando categoria..." : "Criando categoria...");
    let newImageUrl: string | null = currentImageUrl; // Começa com a imagem existente

    try {
      // Lidar com o upload da imagem
      const imageFile = values.image;
      if (imageFile) {
        // Se houver uma imagem existente e uma nova for enviada, deleta a antiga
        if (currentImageUrl) {
          const oldImagePath = getRelativePathFromUrlOrPath(currentImageUrl, 'category_images');
          await supabase.storage.from("category_images").remove([oldImagePath]);
        }
        const fileName = `${values.slug}-${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from("category_images").upload(fileName, imageFile);
        if (uploadError) throw new Error(`Erro no upload da imagem: ${uploadError.message}`);
        newImageUrl = fileName; // Armazena o caminho relativo
      } else if (currentImageUrl && !imageFile && !form.formState.dirtyFields.image) {
        // Se não houver nova imagem e a imagem existente não foi removida, mantém a URL existente
        newImageUrl = currentImageUrl;
      } else if (!imageFile && !currentImageUrl) {
        // Se não houver imagem e não houver imagem existente, define como null
        newImageUrl = null;
      }

      const customFields = values.custom_fields && values.custom_fields.trim() !== '' ? JSON.parse(values.custom_fields) : null;
      const serviceTagsArray = values.connected_service_tags?.split(',').map(tag => tag.trim()).filter(Boolean) || null;
      
      const payload = {
        name: values.name,
        slug: values.slug,
        icon: values.icon,
        parent_slug: values.parent_slug,
        custom_fields: customFields,
        connected_service_tags: serviceTagsArray,
        image_url: newImageUrl, // Incluir a nova URL da imagem
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
      queryClient.invalidateQueries({ queryKey: ["categories"] }); // Invalida para o SubHeader e CategoryGrid
      setIsDialogOpen(false);
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const toastId = showLoading("Excluindo categoria...");
    try {
      // Deletar imagem do storage se existir
      if (category.image_url) {
        const imagePath = getRelativePathFromUrlOrPath(category.image_url, 'category_images');
        await supabase.storage.from("category_images").remove([imagePath]);
      }

      const { error } = await supabase.from("categories").delete().eq("id", category.id);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess("Categoria excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["allCategories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] }); // Invalida para o SubHeader e CategoryGrid
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  const topLevelCategories = categories?.filter(cat => !cat.parent_slug) || [];

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
                <TableHead>Pai</TableHead>
                <TableHead>Ícone</TableHead>
                <TableHead>Imagem</TableHead> {/* Nova coluna */}
                <TableHead>Tags de Serviço</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell> {/* Skeleton para a nova coluna */}
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                </TableRow>
              ))}
              {categories?.map((cat: Category) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>{cat.slug}</TableCell>
                  <TableCell>{cat.parent_slug ? categories.find(p => p.slug === cat.parent_slug)?.name : '-'}</TableCell>
                  <TableCell>{cat.icon}</TableCell>
                  <TableCell>
                    {cat.image_url ? (
                      <img src={supabase.storage.from("category_images").getPublicUrl(getRelativePathFromUrlOrPath(cat.image_url, 'category_images')).data.publicUrl} alt={cat.name} className="h-10 w-10 object-cover rounded-md" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{cat.connected_service_tags?.join(', ')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cat)}>
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
              <Label htmlFor="parent_slug">Categoria Pai (Opcional)</Label>
              <Select onValueChange={(value) => form.setValue("parent_slug", value === "" ? null : value)} value={form.watch("parent_slug") || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria pai" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma (Categoria Principal)</SelectItem>
                  {topLevelCategories.filter(cat => cat.id !== editingCategory?.id).map(cat => (
                    <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.parent_slug && <p className="text-red-500 text-sm">{form.formState.errors.parent_slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="icon">Ícone (Lucide)</Label>
              <Input id="icon" {...form.register("icon")} />
              {form.formState.errors.icon && <p className="text-red-500 text-sm">{form.formState.errors.icon.message}</p>}
            </div>
            <div>
              <Label htmlFor="image">Imagem da Categoria (Opcional)</Label>
              <ImageUploader
                onFileChange={(file) => {
                  form.setValue("image", file);
                  setCurrentImageUrl(file ? URL.createObjectURL(file) : null); // Atualiza a pré-visualização
                }}
                title="Arraste e solte ou clique para selecionar uma imagem"
                initialImageUrl={currentImageUrl ? supabase.storage.from("category_images").getPublicUrl(getRelativePathFromUrlOrPath(currentImageUrl, 'category_images')).data.publicUrl : undefined}
              />
              {form.formState.errors.image && <p className="text-red-500 text-sm">{form.formState.errors.image.message}</p>}
              <p className="text-sm text-muted-foreground mt-1">
                Esta imagem será usada para representar a categoria na página inicial e no cabeçalho.
              </p>
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