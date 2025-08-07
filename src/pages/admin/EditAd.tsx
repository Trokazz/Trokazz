import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";

const adFormSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.coerce.number().positive("O preço deve ser um valor positivo."),
  new_images: z.instanceof(FileList).optional(),
});

const fetchAd = async (id: string) => {
  const { data, error } = await supabase.from("advertisements").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
};

const EditAd = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  const { data: ad, isLoading } = useQuery({
    queryKey: ["ad", id],
    queryFn: () => fetchAd(id!),
    enabled: !!id,
  });

  const form = useForm<z.infer<typeof adFormSchema>>({
    resolver: zodResolver(adFormSchema),
  });

  useEffect(() => {
    if (ad) {
      form.reset({
        title: ad.title,
        description: ad.description,
        price: ad.price,
      });
      setExistingImages(ad.image_urls || []);
    }
  }, [ad, form]);

  const handleImageDelete = (imageUrl: string) => {
    setImagesToDelete(prev => [...prev, imageUrl]);
    setExistingImages(prev => prev.filter(url => url !== imageUrl));
  };

  async function onSubmit(values: z.infer<typeof adFormSchema>) {
    const newImageFiles = values.new_images ? Array.from(values.new_images) : [];
    const finalImageCount = existingImages.length + newImageFiles.length;

    if (finalImageCount === 0) {
      showError("O anúncio deve ter pelo menos uma imagem.");
      return;
    }
    if (finalImageCount > 5) {
      showError("Você pode ter no máximo 5 imagens no total.");
      return;
    }

    const toastId = showLoading("Atualizando anúncio...");
    setIsSubmitting(true);
    try {
      if (imagesToDelete.length > 0) {
        const imagePaths = imagesToDelete.map(url => url.split("/advertisements/")[1]).filter(Boolean);
        if (imagePaths.length > 0) {
          const { error: deleteError } = await supabase.storage.from("advertisements").remove(imagePaths);
          if (deleteError) throw new Error(`Erro ao deletar imagens: ${deleteError.message}`);
        }
      }

      const newImageUrls: string[] = [];
      if (newImageFiles.length > 0) {
        for (const imageFile of newImageFiles) {
          const fileName = `${ad.user_id}/${Date.now()}-${imageFile.name}`;
          const { error: uploadError } = await supabase.storage.from("advertisements").upload(fileName, imageFile);
          if (uploadError) throw new Error(`Erro no upload da imagem: ${uploadError.message}`);
          const { data: { publicUrl } } = supabase.storage.from("advertisements").getPublicUrl(fileName);
          newImageUrls.push(publicUrl);
        }
      }

      const finalImageUrls = [...existingImages, ...newImageUrls];
      const { error } = await supabase
        .from("advertisements")
        .update({
          title: values.title,
          description: values.description,
          price: values.price,
          image_urls: finalImageUrls,
        })
        .eq("id", id!);

      if (error) throw new Error(error.message);

      dismissToast(toastId);
      showSuccess("Anúncio atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["allAds"] });
      navigate("/admin/ads");
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Ocorreu um erro.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Anúncio</CardTitle>
        <CardDescription>
          Faça alterações nos detalhes do anúncio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormItem>
              <FormLabel>Imagens do Anúncio</FormLabel>
              <div className="grid grid-cols-3 gap-4">
                {existingImages.map(url => (
                  <div key={url} className="relative group">
                    <img src={url} alt="Imagem do anúncio" className="w-full h-24 object-cover rounded-md" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleImageDelete(url)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <FormControl>
                <Input type="file" accept="image/*" multiple {...form.register("new_images")} />
              </FormControl>
              <FormDescription>
                Você pode remover imagens existentes e adicionar novas (máximo 5 no total).
              </FormDescription>
              <FormMessage />
            </FormItem>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Anúncio</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea className="resize-y min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/admin/ads")}>
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default EditAd;