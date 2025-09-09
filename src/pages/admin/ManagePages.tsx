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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from "@/utils/toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const pageSchema = z.object({
  slug: z.string().min(1, "Slug é obrigatório.").regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens."),
  title: z.string().min(1, "Título é obrigatório."),
  content: z.string().optional().nullable(),
});

type PageFormData = z.infer<typeof pageSchema>;

const fetchPages = async () => {
  const { data, error } = await supabase.from("pages").select("*").order("slug");
  if (error) throw new Error(error.message);
  return data;
};

const ManagePagesPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<any>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<PageFormData>({
    resolver: zodResolver(pageSchema),
  });

  const { data: pages, isLoading, error } = useQuery({
    queryKey: ["adminPages"],
    queryFn: fetchPages,
  });

  const mutation = useMutation({
    mutationFn: async (formData: { data: PageFormData, slug?: string }) => {
      const dataToSubmit = {
        ...formData.data,
        content: formData.data.content || null,
      };

      if (formData.slug) {
        const { error } = await supabase.from("pages").update(dataToSubmit).eq("slug", formData.slug);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pages").insert(dataToSubmit);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPages"] });
      showSuccess(`Página ${selectedPage ? 'atualizada' : 'criada'} com sucesso!`);
      setIsDialogOpen(false);
      setSelectedPage(null);
    },
    onError: (err: any) => showError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const { error } = await supabase.from("pages").delete().eq("slug", slug);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPages"] });
      showSuccess("Página removida com sucesso!");
    },
    onError: (err: any) => showError(err.message),
  });

  useEffect(() => {
    if (selectedPage) {
      reset(selectedPage);
    } else {
      reset({
        slug: '',
        title: '',
        content: '',
      });
    }
  }, [selectedPage, reset]);

  const handleOpenDialog = (page: any = null) => {
    setSelectedPage(page);
    setIsDialogOpen(true);
  };

  const handleDelete = (slug: string) => {
    deleteMutation.mutate(slug);
  };

  const modules = {
    toolbar: [
      [{ 'header': '1'}, {'header': '2'}, { 'font': [] }],
      [{size: []}],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, 
       {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video'
  ];

  const isFormDisabled = mutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gerenciar Páginas Estáticas</CardTitle>
        <Button onClick={() => handleOpenDialog()} disabled={isFormDisabled || isDeleting}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nova Página
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <p className="text-destructive">Falha ao carregar páginas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages?.map((page) => (
                <TableRow key={page.slug}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell>{page.slug}</TableCell>
                  <TableCell>{page.updated_at ? new Date(page.updated_at).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(page)} disabled={isFormDisabled || isDeleting}>
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
                            Esta ação não pode ser desfeita. Isso removerá permanentemente a página "{page.title}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(page.slug)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
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
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{selectedPage ? 'Editar' : 'Nova'} Página</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => mutation.mutate({ data, slug: selectedPage?.slug }))} className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input id="title" {...register("title")} disabled={isFormDisabled} />
              {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...register("slug")} disabled={!!selectedPage || isFormDisabled} />
              {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="content">Conteúdo</Label>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <ReactQuill 
                    theme="snow" 
                    value={field.value || ''} 
                    onChange={field.onChange} 
                    modules={modules}
                    formats={formats}
                    className="h-64 mb-12"
                    readOnly={isFormDisabled}
                  />
                )}
              />
            </div>
            <DialogFooter className="mt-16">
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

export default ManagePagesPage;