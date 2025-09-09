"use client";

import { useState, useEffect, useRef } from "react";
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
import { PlusCircle, Edit, Trash2, Loader2, Upload, X } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/utils/toast";
import { format } from 'date-fns';

// Removido image_url do esquema, será validado manualmente
const bannerSchema = z.object({
  title: z.string().min(1, "Título é obrigatório."),
  description: z.string().optional().nullable(),
  link_url: z.string().url("URL do link inválida.").optional().nullable(),
  button_text: z.string().optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  background_color: z.string().optional().nullable(),
  text_color: z.string().optional().nullable(),
});

type BannerFormData = z.infer<typeof bannerSchema>;

const fetchBanners = async () => {
  const { data, error } = await supabase.from("banners").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const ManageBannersPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: banners, isLoading, error } = useQuery({
    queryKey: ["adminBanners"],
    queryFn: fetchBanners,
  });

  const mutation = useMutation({
    mutationFn: async (formData: { data: BannerFormData, id?: string }) => {
      let finalImageUrl = previewUrl; // Começa com a URL de preview (pode ser existente ou de um novo arquivo)

      if (selectedFile) {
        setIsUploadingImage(true);
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(filePath, selectedFile);

        if (uploadError) {
          setIsUploadingImage(false);
          throw new Error(`Erro ao fazer upload da imagem: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('banners')
          .getPublicUrl(filePath);
        
        finalImageUrl = publicUrlData.publicUrl;
        setIsUploadingImage(false);
      } else if (!finalImageUrl && !formData.id) {
        // Se não há arquivo selecionado, não há preview e não é uma edição, a imagem é obrigatória
        throw new Error("Por favor, adicione uma imagem para o banner.");
      }

      const dataToSubmit = {
        ...formData.data,
        image_url: finalImageUrl, // Adiciona a URL final da imagem explicitamente
        description: formData.data.description || null,
        link_url: formData.data.link_url || null,
        button_text: formData.data.button_text || null,
        starts_at: formData.data.starts_at ? new Date(formData.data.starts_at).toISOString() : null,
        ends_at: formData.data.ends_at ? new Date(formData.data.ends_at).toISOString() : null,
        background_color: formData.data.background_color || null,
        text_color: formData.data.text_color || null,
      };

      if (formData.id) {
        const { error } = await supabase.from("banners").update(dataToSubmit).eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert(dataToSubmit);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBanners"] });
      queryClient.invalidateQueries({ queryKey: ["homeBanners"] }); // Invalidate public home banners
      showSuccess(`Banner ${selectedBanner ? 'atualizado' : 'criado'} com sucesso!`);
      setIsDialogOpen(false);
      setSelectedBanner(null);
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (err: any) => {
      showError(err.message);
      setIsUploadingImage(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: bannerToDelete, error: fetchError } = await supabase
        .from('banners')
        .select('image_url')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete image from storage if it exists
      if (bannerToDelete?.image_url) {
        const urlParts = bannerToDelete.image_url.split('/public/banners/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0]; // Remove query params
          const { error: storageError } = await supabase.storage.from('banners').remove([filePath]);
          if (storageError) console.error("Error deleting banner image from storage:", storageError.message);
        }
      }

      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBanners"] });
      queryClient.invalidateQueries({ queryKey: ["homeBanners"] });
      showSuccess("Banner removido com sucesso!");
    },
    onError: (err: any) => showError(err.message),
  });

  const { register, handleSubmit, control, reset, getValues, formState: { errors } } = useForm<BannerFormData>({
    resolver: zodResolver(bannerSchema),
  });

  useEffect(() => {
    if (selectedBanner) {
      reset({
        ...selectedBanner,
        starts_at: selectedBanner.starts_at ? format(new Date(selectedBanner.starts_at), "yyyy-MM-dd") : null,
        ends_at: selectedBanner.ends_at ? format(new Date(selectedBanner.ends_at), "yyyy-MM-dd") : null,
      });
      setPreviewUrl(selectedBanner.image_url);
      setSelectedFile(null);
    } else {
      reset({
        title: '',
        description: null,
        link_url: null,
        button_text: null,
        starts_at: null,
        ends_at: null,
        is_active: true,
        background_color: '#f1f5f9', // Default light gray
        text_color: '#0f172a', // Default dark text
      });
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  }, [selectedBanner, reset]);

  const handleOpenDialog = (banner: any = null) => {
    setSelectedBanner(banner);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreviewUrl(selectedBanner?.image_url || null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    // Se estiver editando, a URL da imagem existente será mantida no `selectedBanner`
    // Se for um novo banner, `image_url` no formulário será nulo, o que é o comportamento desejado.
  };

  const isFormDisabled = mutation.isPending || isUploadingImage;
  const isDeleting = deleteMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gerenciar Banners</CardTitle>
        <Button onClick={() => handleOpenDialog()} disabled={isFormDisabled || isDeleting}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Banner
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <p className="text-destructive">Falha ao carregar banners.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Imagem</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners?.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell className="font-medium">{banner.title}</TableCell>
                  <TableCell>
                    <img src={banner.image_url || '/placeholder.svg'} alt={banner.title} className="w-16 h-9 object-cover rounded-md" loading="lazy" />
                  </TableCell>
                  <TableCell>{banner.is_active ? 'Sim' : 'Não'}</TableCell>
                  <TableCell>{banner.starts_at ? format(new Date(banner.starts_at), 'dd/MM/yyyy') : 'Sempre'}</TableCell>
                  <TableCell>{banner.ends_at ? format(new Date(banner.ends_at), 'dd/MM/yyyy') : 'Nunca'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(banner)} disabled={isFormDisabled || isDeleting}>
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
                            Esta ação não pode ser desfeita. Isso removerá permanentemente o banner "{banner.title}" e sua imagem associada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(banner.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
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
            <DialogTitle>{selectedBanner ? 'Editar' : 'Novo'} Banner</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => mutation.mutate({ data, id: selectedBanner?.id }))} className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input id="title" {...register("title")} disabled={isFormDisabled} />
              {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea id="description" {...register("description")} disabled={isFormDisabled} />
            </div>
            
            {/* Image Upload Section */}
            <div>
              <Label htmlFor="image_upload">Imagem do Banner</Label>
              <div className="mt-2 flex items-center gap-4">
                {previewUrl && (
                  <div className="relative w-32 h-16 rounded-md overflow-hidden border">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={handleRemoveImage}
                      disabled={isFormDisabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isFormDisabled || isUploadingImage}
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {previewUrl ? 'Mudar Imagem' : 'Selecionar Imagem'}
                    </>
                  )}
                </Button>
                <input
                  id="image_upload"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  disabled={isFormDisabled || isUploadingImage}
                />
              </div>
              {/* Removido o erro de validação direto do esquema para image_url */}
            </div>

            <div>
              <Label htmlFor="link_url">URL do Link (Opcional)</Label>
              <Input id="link_url" {...register("link_url")} disabled={isFormDisabled} />
              {errors.link_url && <p className="text-destructive text-sm">{errors.link_url.message}</p>}
            </div>
            <div>
              <Label htmlFor="button_text">Texto do Botão (Opcional)</Label>
              <Input id="button_text" {...register("button_text")} disabled={isFormDisabled} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="starts_at">Data de Início (Opcional)</Label>
                <Input id="starts_at" type="date" {...register("starts_at")} disabled={isFormDisabled} />
              </div>
              <div>
                <Label htmlFor="ends_at">Data de Fim (Opcional)</Label>
                <Input id="ends_at" type="date" {...register("ends_at")} disabled={isFormDisabled} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="background_color">Cor de Fundo (Opcional)</Label>
                <Input id="background_color" type="color" {...register("background_color")} disabled={isFormDisabled} />
              </div>
              <div>
                <Label htmlFor="text_color">Cor do Texto (Opcional)</Label>
                <Input id="text_color" type="color" {...register("text_color")} disabled={isFormDisabled} />
              </div>
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

export default ManageBannersPage;