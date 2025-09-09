import React, { useState, useEffect } from "react";
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
import { PlusCircle, Edit, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
import { showError, showSuccess } from "@/utils/toast";
import { Icon } from "@/components/IconMapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório."),
  slug: z.string().min(1, "Slug é obrigatório.").regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens."),
  icon: z.string().optional().nullable(),
  parent_slug: z.string().optional().nullable(),
  image_url: z.string().url("URL da imagem inválida.").optional().nullable(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const ManageCategoriesPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { register, handleSubmit, control, reset, getValues, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["adminCategories"],
    queryFn: fetchCategories,
  });

  const mutation = useMutation({
    mutationFn: async (formData: { data: CategoryFormData, id?: string }) => {
      const dataToSubmit = {
        ...formData.data,
        icon: formData.data.icon || null,
        parent_slug: formData.data.parent_slug || null,
        image_url: formData.data.image_url || null,
      };

      if (formData.id) {
        const { error } = await supabase.from("categories").update(dataToSubmit).eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(dataToSubmit);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      queryClient.invalidateQueries({ queryKey: ["allCategories"] }); // Invalidate public categories
      showSuccess(`Categoria ${selectedCategory ? 'atualizada' : 'criada'} com sucesso!`);
      setIsDialogOpen(false);
      setSelectedCategory(null);
    },
    onError: (err: any) => showError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      queryClient.invalidateQueries({ queryKey: ["allCategories"] });
      showSuccess("Categoria removida com sucesso!");
    },
    onError: (err: any) => showError(err.message),
  });

  useEffect(() => {
    if (selectedCategory) {
      reset(selectedCategory);
    } else {
      reset({
        name: '',
        slug: '',
        icon: null,
        parent_slug: null,
        image_url: null,
      });
    }
  }, [selectedCategory, reset]);

  const handleOpenDialog = (category: any = null) => {
    setSelectedCategory(category);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const toggleExpand = (slug: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slug)) {
        newSet.delete(slug);
      } else {
        newSet.add(slug);
      }
      return newSet;
    });
  };

  const parentCategories = categories?.filter(c => !c.parent_slug) || [];
  const getSubcategories = (parentSlug: string) => categories?.filter(c => c.parent_slug === parentSlug) || [];

  const isFormDisabled = mutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gerenciar Categorias</CardTitle>
        <Button onClick={() => handleOpenDialog()} disabled={isFormDisabled || isDeleting}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <p className="text-destructive">Falha ao carregar categorias.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Ícone</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parentCategories.map((category) => (
                <React.Fragment key={category.id}>
                  <TableRow>
                    <TableCell className="font-medium flex items-center gap-2">
                      {getSubcategories(category.slug).length > 0 && (
                        <Button variant="ghost" size="icon" onClick={() => toggleExpand(category.slug)} className="h-6 w-6" disabled={isFormDisabled || isDeleting}>
                          {expandedCategories.has(category.slug) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                      <Icon name={category.icon} className="h-5 w-5 mr-2" />
                      {category.name}
                    </TableCell>
                    <TableCell>{category.slug}</TableCell>
                    <TableCell>{category.icon || 'N/A'}</TableCell>
                    <TableCell>N/A</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(category)} disabled={isFormDisabled || isDeleting}>
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
                              Esta ação não pode ser desfeita. Isso removerá permanentemente esta categoria e todas as suas subcategorias.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(category.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
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
                  {expandedCategories.has(category.slug) && getSubcategories(category.slug).map((subCategory) => (
                    <TableRow key={subCategory.id} className="bg-muted/50">
                      <TableCell className="pl-12 flex items-center gap-2">
                        <Icon name={subCategory.icon} className="h-4 w-4 mr-2" />
                        {subCategory.name}
                      </TableCell>
                      <TableCell>{subCategory.slug}</TableCell>
                      <TableCell>{subCategory.icon || 'N/A'}</TableCell>
                      <TableCell>{subCategory.parent_slug}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(subCategory)} disabled={isFormDisabled || isDeleting}>
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
                                Esta ação não pode ser desfeita. Isso removerá permanentemente esta subcategoria.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(subCategory.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
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
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCategory ? 'Editar' : 'Nova'} Categoria</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => mutation.mutate({ data, id: selectedCategory?.id }))} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register("name")} disabled={isFormDisabled} />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...register("slug")} disabled={!!selectedCategory || isFormDisabled} />
              {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="icon">Ícone (Nome do Lucide Icon)</Label>
              <Input id="icon" {...register("icon")} placeholder="Ex: Home, Car, Wrench" disabled={isFormDisabled} />
            </div>
            <div>
              <Label htmlFor="parent_slug">Categoria Pai (Opcional)</Label>
              <Select onValueChange={(value) => reset({ ...getValues(), parent_slug: value === "none-parent" ? null : value })} value={selectedCategory?.parent_slug || "none-parent"} disabled={isFormDisabled}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria pai" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none-parent">Nenhuma (Categoria Principal)</SelectItem>
                  {categories?.filter(c => !c.parent_slug).map(cat => (
                    <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="image_url">URL da Imagem (Opcional)</Label>
              <Input id="image_url" {...register("image_url")} placeholder="https://example.com/image.jpg" disabled={isFormDisabled} />
              {errors.image_url && <p className="text-destructive text-sm">{errors.image_url.message}</p>}
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

export default ManageCategoriesPage;