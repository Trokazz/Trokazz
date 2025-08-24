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
import { useNavigate } from "react-router-dom";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Loader2, ArrowLeft } from "lucide-react"; // Importar Loader2 e ArrowLeft
import { getRelativePathFromUrlOrPath } from "@/lib/utils"; // Importar a nova função
import MultiImageUploader from "./MultiImageUploader"; // Importar MultiImageUploader

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const adFormSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.coerce.number().positive("O preço deve ser um valor positivo."),
  // Alterado para aceitar File ou string (para caminhos de imagens existentes)
  images: z.array(z.union([z.instanceof(File), z.string()]))
    .min(1, "Pelo menos uma imagem é obrigatória.")
    .max(MAX_FILES, `Você pode ter no máximo ${MAX_FILES} imagens.`)
    .refine(files => files.every(file => typeof file === 'string' || file.size <= MAX_FILE_SIZE), `Cada arquivo deve ter no máximo 5MB.`),
});

const fetchAd = async (id: string) => {
  const { data, error } = await supabase.from("advertisements").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
};

interface EditAdFormProps {
  adId: string;
  userType: 'admin' | 'user';
}

const EditAdForm = ({ adId, userType }: EditAdFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: ad, isLoading } = useQuery({
    queryKey: ["adDataForEdit", adId],
    queryFn: () => fetchAd(adId),
    enabled: !!adId,
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
        // Converte as URLs públicas existentes para caminhos relativos para o MultiImageUploader
        images: ad.image_urls.map(url => getRelativePathFromUrlOrPath(url, 'advertisements')),
      });
    }
  }, [ad, form]);

  async function onSubmit(values: z.infer<typeof adFormSchema>) {
    const toastId = showLoading("Atualizando anúncio...");
    setIsSubmitting(true);

    const currentImagePaths: string[] = [];
    const newImageFiles: File[] = [];
    const uploadedNewImagePaths: string[] = []; // Para rastrear uploads bem-sucedidos para limpeza

    // Separa as imagens em novas (File) e existentes (string)
    values.images.forEach(image => {
      if (typeof image === 'string') {
        currentImagePaths.push(image); // Caminho relativo existente
      } else {
        newImageFiles.push(image); // Novo arquivo a ser enviado
      }
    });

    // Identifica imagens a serem deletadas (estavam no `ad.image_urls` original mas não estão mais em `currentImagePaths`)
    const originalImagePaths = ad?.image_urls.map(url => getRelativePathFromUrlOrPath(url, 'advertisements')) || [];
    const imagesToDelete = originalImagePaths.filter(path => !currentImagePaths.includes(path));

    try {
      // 1. Deleta imagens removidas
      if (imagesToDelete.length > 0) {
        const { error: deleteError } = await supabase.storage.from("advertisements").remove(imagesToDelete);
        if (deleteError) console.error("Erro ao deletar imagens antigas:", deleteError.message);
      }

      // 2. Faz upload de novas imagens
      if (newImageFiles.length > 0) {
        for (const imageFile of newImageFiles) {
          const fileName = `${ad.user_id}/${Date.now()}-${Math.random()}-${imageFile.name}`;
          const { error: uploadError } = await supabase.storage.from("advertisements").upload(fileName, imageFile);
          if (uploadError) throw new Error(`Erro no upload da nova imagem: ${uploadError.message}`);
          uploadedNewImagePaths.push(fileName); // Rastreia para limpeza
        }
      }

      // 3. Combina todos os caminhos de imagem (existentes + novos uploads) na ordem atual do formulário
      const finalImageUrls = values.images.map(item => {
        if (typeof item === 'string') {
          return item; // É um caminho existente
        } else {
          // Encontra o caminho correspondente para o arquivo recém-enviado
          const uploadedPath = uploadedNewImagePaths.find(path => path.includes(item.name));
          if (!uploadedPath) throw new Error(`Caminho de upload não encontrado para o arquivo: ${item.name}`);
          return uploadedPath;
        }
      });

      const { error } = await supabase
        .from("advertisements")
        .update({
          title: values.title,
          description: values.description,
          price: values.price,
          image_urls: finalImageUrls, // Salva a lista final e ordenada de caminhos relativos
          status: userType === 'user' ? 'approved' : ad.status, // Mantém o status se for admin, re-aprova se for usuário
        })
        .eq("id", adId);

      if (error) throw new Error(error.message);

      dismissToast(toastId);
      showSuccess("Anúncio atualizado com sucesso!");
      
      if (userType === 'admin') {
        queryClient.invalidateQueries({ queryKey: ["allAds"] });
        navigate("/admin/ads");
      } else {
        queryClient.invalidateQueries({ queryKey: ["profilePageData"] });
        navigate("/perfil");
      }
    } catch (error) {
      // Em caso de erro, tenta remover as imagens que foram recém-enviadas
      if (uploadedNewImagePaths.length > 0) {
         await supabase.storage.from("advertisements").remove(uploadedNewImagePaths).catch(e => console.error("Erro ao limpar imagens após falha:", e));
      }
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
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(userType === 'admin' ? '/admin/ads' : '/perfil')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <CardTitle>Editar Anúncio</CardTitle>
          <CardDescription>
            Faça as alterações necessárias no anúncio.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagens do Anúncio</FormLabel>
                  <FormControl>
                    <MultiImageUploader
                      onChange={field.onChange}
                      maxFiles={MAX_FILES}
                      initialImageUrls={ad?.image_urls.map(url => getRelativePathFromUrlOrPath(url, 'advertisements')) || []}
                    />
                  </FormControl>
                  <FormDescription>
                    A primeira imagem será a capa do seu anúncio. Arraste para reordenar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default EditAdForm;