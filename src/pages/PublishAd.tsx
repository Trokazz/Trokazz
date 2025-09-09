import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { useNavigate, Link, useParams } from "react-router-dom";
import { Camera, ArrowLeft, PlusCircle, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const adSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.coerce.number().positive("O preço deve ser um número positivo."),
  category_slug: z.string({ required_error: "Por favor, selecione uma categoria." }),
  subcategory_slug: z.string({ required_error: "Por favor, selecione uma subcategoria." }),
  condition: z.enum(["new", "used", "refurbished"], { required_error: "Por favor, selecione a condição do item." }),
  location_city: z.string().min(2, "A cidade é obrigatória."),
  location_state: z.string().min(2, "O estado é obrigatório."),
  location_neighborhood: z.string().optional().nullable(), // Novo campo
});

type AdFormData = z.infer<typeof adSchema>;

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("name, slug, parent_slug").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const fetchAdForEdit = async (adId: string) => {
  const { data, error } = await supabase
    .from('advertisements')
    .select('title, description, price, category_slug, subcategory_slug, condition, location_city, location_state, location_neighborhood, image_urls') // Incluído location_neighborhood
    .eq('id', adId)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const PublishAdPage = () => {
  const { id: adId } = useParams<{ id: string }>();
  const isEditMode = !!adId;
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdFormData>({
    resolver: zodResolver(adSchema),
  });

  const selectedCategorySlug = watch('category_slug');

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: adData, isLoading: isLoadingAd } = useQuery({
    queryKey: ['adForEdit', adId],
    queryFn: () => fetchAdForEdit(adId!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (adData) {
      reset(adData);
      setUploadedImageUrls(adData.image_urls || []);
    }
  }, [adData, reset]);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);

    if (uploadedImageUrls.length + selectedFiles.length + files.length > 5) {
      showError("Você pode adicionar no máximo 5 imagens.");
      return;
    }

    setSelectedFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setSelectedFilePreviews(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePreview = async (indexToRemove: number, isUploaded: boolean) => {
    if (isUploaded) {
      const urlToRemove = uploadedImageUrls[indexToRemove];
      setUploadedImageUrls(prev => prev.filter((_, i) => i !== indexToRemove));

      try {
        const urlParts = urlToRemove.split('/public/ad-images/');
        if (urlParts.length < 2) {
          throw new Error("URL de imagem inválida para remoção.");
        }
        const filePath = urlParts[1].split('?')[0];

        const { error: deleteError } = await supabase.storage.from('ad-images').remove([filePath]);
        if (deleteError) throw deleteError;
        showSuccess("Imagem removida do storage!");
      } catch (error: any) {
        showError(`Falha ao remover a imagem do storage: ${error.message}`);
        setUploadedImageUrls(prev => {
          const newUrls = [...prev];
          newUrls.splice(indexToRemove, 0, urlToRemove);
          return newUrls;
        });
      }
    } else {
      const newSelectedFiles = selectedFiles.filter((_, i) => i !== indexToRemove);
      const newSelectedFilePreviews = selectedFilePreviews.filter((_, i) => i !== indexToRemove);
      setSelectedFiles(newSelectedFiles);
      setSelectedFilePreviews(newSelectedFilePreviews);
      URL.revokeObjectURL(selectedFilePreviews[indexToRemove]);
    }
  };

  const handleReorderImage = (index: number, direction: 'left' | 'right', isUploaded: boolean) => {
    if (isUploaded) {
      setUploadedImageUrls(prev => {
        const newUrls = [...prev];
        const [removed] = newUrls.splice(index, 1);
        const newIndex = direction === 'left' ? Math.max(0, index - 1) : Math.min(prev.length - 1, index + 1);
        newUrls.splice(newIndex, 0, removed);
        return newUrls;
      });
    } else {
      setSelectedFilePreviews(prev => {
        const newPreviews = [...prev];
        const [removedPreview] = newPreviews.splice(index, 1);
        const newIndex = direction === 'left' ? Math.max(0, index - 1) : Math.min(prev.length - 1, index + 1);
        newPreviews.splice(newIndex, 0, removedPreview);
        return newPreviews;
      });
      setSelectedFiles(prev => {
        const newFiles = [...prev];
        const [removedFile] = newFiles.splice(index, 1);
        const newIndex = direction === 'left' ? Math.max(0, index - 1) : Math.min(prev.length - 1, index + 1);
        newFiles.splice(newIndex, 0, removedFile);
        return newFiles;
      });
    }
  };

  const uploadNewImages = async (filesToUpload: File[]) => {
    if (!user) throw new Error("Usuário não autenticado.");
    setIsUploadingImages(true);
    const newUploadedUrls: string[] = [];

    for (const file of filesToUpload) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ad-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error("Supabase upload error:", uploadError); // Log the full error
        showError(`Erro no upload de ${file.name}: ${uploadError.message || "Erro desconhecido."}`);
        continue;
      }

      const { data } = supabase.storage
        .from('ad-images')
        .getPublicUrl(fileName);
      
      newUploadedUrls.push(data.publicUrl);
    }
    setIsUploadingImages(false);
    return newUploadedUrls;
  };

  const onSubmit = async (data: AdFormData) => {
    try {
      if (!user) {
        showError("Você precisa estar logado.");
        return navigate("/auth");
      }

      if (uploadedImageUrls.length + selectedFiles.length === 0) {
        showError("Por favor, adicione pelo menos uma imagem para o anúncio.");
        return;
      }

      let finalImageUrls = [...uploadedImageUrls];
      if (selectedFiles.length > 0) {
        const newUrls = await uploadNewImages(selectedFiles);
        finalImageUrls = [...finalImageUrls, ...newUrls];
      }

      if (finalImageUrls.length === 0) {
        showError("Nenhuma imagem foi carregada com sucesso.");
        return;
      }

      const adDataToSave = {
        user_id: user.id,
        title: data.title,
        description: data.description,
        price: data.price,
        category_slug: data.category_slug,
        subcategory_slug: data.subcategory_slug,
        condition: data.condition,
        location_city: data.location_city,
        location_state: data.location_state,
        location_neighborhood: data.location_neighborhood || null, // Incluído location_neighborhood
        image_urls: finalImageUrls,
        status: 'pending_approval',
      };

      console.log("Payload enviado ao Supabase:", adDataToSave); // Log do payload

      if (isEditMode) {
        const { error } = await supabase
          .from("advertisements")
          .update(adDataToSave)
          .eq('id', adId);
        
        if (error) {
          console.error("Supabase update ad error:", error); // Log do erro completo
          showError(error.message || "Ocorreu um erro desconhecido ao atualizar o anúncio.");
          return;
        } else {
          showSuccess("Anúncio atualizado com sucesso!");
          navigate(`/manage-ad/${adId}`);
        }
      } else {
        const { error } = await supabase.from("advertisements").insert(adDataToSave);

        if (error) {
          console.error("Supabase insert ad error:", error); // Log do erro completo
          showError(error.message || "Ocorreu um erro desconhecido ao publicar o anúncio.");
          return;
        } else {
          showSuccess("Anúncio publicado com sucesso! Ele será revisado em breve.");
          navigate("/profile");
        }
      }
    } catch (error: any) {
      console.error("Erro geral ao publicar/editar anúncio:", error); // Log do erro completo
      showError(error.message || "Ocorreu um erro inesperado. Por favor, tente novamente.");
    }
  };

  if (isLoadingAd || isLoadingCategories) {
    return (
        <div className="p-4 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
    )
  }

  const totalImages = uploadedImageUrls.length + selectedFilePreviews.length;
  const canAddMoreImages = totalImages < 5;
  const isFormDisabled = isSubmitting || isUploadingImages;

  const parentCategories = categories?.filter(cat => !cat.parent_slug) || [];
  const subcategories = categories?.filter(cat => cat.parent_slug === selectedCategorySlug) || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 text-center relative">
        <Link to="/" className="absolute left-4 top-1/2 -translate-y-1/2 md:hidden">
            <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-bold">{isEditMode ? 'Editar Anúncio' : 'Publicar Anúncio'}</h1>
      </header>

      <div className="bg-primary flex-grow flex flex-col items-center pt-8">
        <div className="flex flex-col items-center justify-center text-primary-foreground mb-8">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* Existing uploaded images */}
            {uploadedImageUrls.map((url, index) => (
              <div key={`uploaded-${index}`} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-primary-foreground/50">
                <img src={url} alt={`Anúncio ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full"
                  onClick={() => handleRemovePreview(index, true)}
                  disabled={isFormDisabled}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between bg-black/50 text-white text-xs p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-white hover:bg-white/20"
                    onClick={() => handleReorderImage(index, 'left', true)}
                    disabled={index === 0 || isFormDisabled}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-white hover:bg-white/20"
                    onClick={() => handleReorderImage(index, 'right', true)}
                    disabled={index === uploadedImageUrls.length - 1 && selectedFilePreviews.length === 0 || isFormDisabled}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {/* New selected file previews */}
            {selectedFilePreviews.map((url, index) => (
              <div key={`preview-${index}`} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-primary-foreground/50">
                <img src={url} alt={`Pré-visualização ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full"
                  onClick={() => handleRemovePreview(index, false)}
                  disabled={isFormDisabled}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between bg-black/50 text-white text-xs p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-white hover:bg-white/20"
                    onClick={() => handleReorderImage(index, 'left', false)}
                    disabled={index === 0 && uploadedImageUrls.length === 0 || isFormDisabled}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-white hover:bg-white/20"
                    onClick={() => handleReorderImage(index, 'right', false)}
                    disabled={index === selectedFilePreviews.length - 1 || isFormDisabled}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {isUploadingImages && (
              <div className="w-24 h-24 rounded-lg bg-primary-foreground/10 flex items-center justify-center border-2 border-dashed border-primary-foreground/50">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            {canAddMoreImages && !isUploadingImages && (
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-lg bg-primary-foreground/10 flex flex-col items-center justify-center border-2 border-dashed border-primary-foreground/50"
                disabled={isFormDisabled}
              >
                <Camera className="h-8 w-8" />
                <span className="text-xs mt-1">Adicionar</span>
              </button>
            )}
          </div>
          <input
            id="image-upload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelection}
            multiple
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            disabled={isFormDisabled || !canAddMoreImages}
          />
          <p className="mt-2 font-semibold">Adicionar Fotos (até 5)</p>
        </div>

        <Card className="w-full max-w-2xl rounded-t-3xl">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="title">Título do Anúncio</Label>
                <Input id="title" {...register("title")} disabled={isFormDisabled} />
                {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description" 
                  {...register("description")} 
                  rows={6} 
                  disabled={isFormDisabled} 
                  placeholder="Descreva seu anúncio em detalhes..."
                />
                {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
              </div>

              <div>
                <Label htmlFor="price">Preço</Label>
                <Input id="price" type="number" step="0.01" {...register("price")} disabled={isFormDisabled} />
                {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
              </div>

              <div>
                <Label>Categoria Principal</Label>
                <Controller
                  name="category_slug"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(value) => { field.onChange(value); setValue('subcategory_slug', ''); }} value={field.value} disabled={isLoadingCategories || isFormDisabled}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {parentCategories.map((cat) => (
                          <SelectItem key={cat.slug} value={cat.slug}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category_slug && <p className="text-sm text-destructive mt-1">{errors.category_slug.message}</p>}
              </div>

              {selectedCategorySlug && (
                <div>
                  <Label>Subcategoria</Label>
                  <Controller
                    name="subcategory_slug"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCategories || isFormDisabled || subcategories.length === 0}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma subcategoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategories.length > 0 ? (
                            subcategories.map((subcat) => (
                              <SelectItem key={subcat.slug} value={subcat.slug}>
                                {subcat.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>Nenhuma subcategoria disponível</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.subcategory_slug && <p className="text-sm text-destructive mt-1">{errors.subcategory_slug.message}</p>}
                </div>
              )}

              <div>
                <Label>Condição</Label>
                <Controller
                  name="condition"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a condição" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Novo</SelectItem>
                        <SelectItem value="used">Usado</SelectItem>
                        <SelectItem value="refurbished">Recondicionado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.condition && <p className="text-sm text-destructive mt-1">{errors.condition.message}</p>}
              </div>

              <div>
                <Label htmlFor="location_city">Cidade</Label>
                <Input id="location_city" {...register("location_city")} disabled={isFormDisabled} />
                {errors.location_city && <p className="text-sm text-destructive mt-1">{errors.location_city.message}</p>}
              </div>

              <div>
                <Label htmlFor="location_state">Estado</Label>
                <Input id="location_state" {...register("location_state")} disabled={isFormDisabled} />
                {errors.location_state && <p className="text-sm text-destructive mt-1">{errors.location_state.message}</p>}
              </div>

              <div> {/* Novo campo para Bairro */}
                <Label htmlFor="location_neighborhood">Bairro (Opcional)</Label>
                <Input id="location_neighborhood" {...register("location_neighborhood")} disabled={isFormDisabled} />
                {errors.location_neighborhood && <p className="text-sm text-destructive mt-1">{errors.location_neighborhood.message}</p>}
              </div>

              <Button type="submit" disabled={isFormDisabled} className="w-full bg-accent hover:bg-accent/90 h-12 text-lg">
                {isFormDisabled ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isEditMode ? 'Salvando...' : 'Publicando...'}
                  </>
                ) : (
                  isEditMode ? 'Salvar Alterações' : 'Publicar Anúncio'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublishAdPage;