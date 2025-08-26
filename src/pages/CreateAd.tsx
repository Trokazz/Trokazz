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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useState, useEffect, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import MultiImageUploader from "@/components/MultiImageUploader";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Loader2, MapPin } from "lucide-react"; // Removido Lightbulb

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Define o esquema base primeiro
const baseAdFormSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.coerce.number().positive("O preço deve ser um valor positivo.").optional(),
  // Alterado para aceitar File ou string (para caminhos de imagens existentes)
  images: z.array(z.union([z.instanceof(File), z.string()]))
    .min(1, "Pelo menos uma imagem é obrigatória.")
    .max(MAX_FILES, `Você pode enviar no máximo ${MAX_FILES} imagens.`)
    .refine(files => files.every(file => typeof file === 'string' || file.size <= MAX_FILE_SIZE), `Cada arquivo deve ter no máximo 5MB.`),
  category_slug: z.string().min(1, "Por favor, selecione uma categoria."),
  latitude: z.number().optional().nullable(), // Permitir null
  longitude: z.number().optional().nullable(), // Permitir null
  tags: z.string().optional().nullable(), // NOVO: Campo para tags
}).catchall(z.any()); // Permite campos dinâmicos para metadados

// Aplica superRefine ao esquema base para validações complexas
const adFormSchema = baseAdFormSchema.superRefine((data, ctx) => {
  const context = (ctx as any)._root?.options?.context || {};
  const category = context.categoryConfig || { hasPriceFilter: false, fields: [] }; // Default para false aqui também

  // Validação condicional para o preço
  if (category.hasPriceFilter === true && (data.price === undefined || data.price === null || data.price <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Por favor, insira um preço válido e positivo para esta categoria.",
      path: ['price'],
    });
  }
});

type Category = { id: string; name: string; slug: string; custom_fields: any; parent_slug: string | null };

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("id, name, slug, custom_fields, parent_slug").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const CreateAd = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryConfig, setCategoryConfig] = useState<any>({ hasPriceFilter: false, fields: [] }); // Default para false
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<string[]>([]);
  const [isLocating, setIsLocating] = useState(false); // Novo estado para o carregamento da localização
  // REMOVIDO: const [isSuggestingCategory, setIsSuggestingCategory] = useState(false); // NOVO: Estado para sugestão de categoria

  const { data: allCategories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const form = useForm<z.infer<typeof adFormSchema>>({
    resolver: zodResolver(adFormSchema),
    defaultValues: {
      title: "",
      description: "",
      images: [],
      category_slug: "",
      latitude: null, // Definir como null por padrão
      longitude: null, // Definir como null por padrão
      tags: "", // NOVO: Default para tags
    },
    context: { categoryConfig }, // Passa categoryConfig para superRefine
  });

  // Efeito para atualizar finalCategorySlug e categoryConfig com base no caminho selecionado
  useEffect(() => {
    if (selectedCategoryPath.length > 0) {
      const deepestSlug = selectedCategoryPath[selectedCategoryPath.length - 1];
      const currentCategory = allCategories?.find(c => c.slug === deepestSlug);
      
      let hasPriceFilter = false; // Default to false
      let fields: any[] = [];

      if (currentCategory?.custom_fields && typeof currentCategory.custom_fields === 'object') {
        const rawCustomFields = currentCategory.custom_fields as { hasPriceFilter?: boolean; fields?: any[] };
        if (rawCustomFields.hasPriceFilter === true) { // Only set to true if explicitly true
          hasPriceFilter = true;
        }
        if (Array.isArray(rawCustomFields.fields)) {
          fields = rawCustomFields.fields;
        }
      }
      const newCategoryConfig = { hasPriceFilter, fields }; // Capture the new config
      setCategoryConfig(newCategoryConfig);
      form.setValue('category_slug', deepestSlug, { shouldValidate: true });
      console.log("CreateAd: Updated categoryConfig:", newCategoryConfig); // ADDED LOG
    } else {
      const defaultCategoryConfig = { hasPriceFilter: false, fields: [] };
      setCategoryConfig(defaultCategoryConfig); // Default seguro
      form.setValue('category_slug', '', { shouldValidate: true });
      console.log("CreateAd: Reset categoryConfig to default:", defaultCategoryConfig); // ADDED LOG
    }
  }, [selectedCategoryPath, allCategories, form]);

  // Função para obter categorias filhas de um slug pai
  const getChildCategories = (parentSlug: string | null) => {
    return allCategories?.filter(cat => cat.parent_slug === parentSlug) || [];
  };

  // Renderiza os seletores de categoria dinamicamente
  const renderCategorySelects = () => {
    // Removed isLoadingCategories check from here, it's now at the top level
    let currentParentSlug: string | null = null;
    const selects = [];

    const initialCategories = getChildCategories(null);

    for (let i = 0; i <= selectedCategoryPath.length; i++) {
      const categoriesAtLevel = getChildCategories(currentParentSlug);

      if (categoriesAtLevel.length === 0 && i > 0) {
        break;
      }

      const level = i;
      const selectedValue = selectedCategoryPath[level] || '';

      selects.push(
        <FormField
          key={`category-level-${level}`}
          control={form.control}
          name={`category_level_${level}` as any} // Usamos um nome de campo dummy
          render={({ field }) => (
            <FormItem>
              <FormLabel>{level === 0 ? "Categoria Principal" : `Subcategoria ${level + 1}`}</FormLabel>
              <Select
                onValueChange={(value) => {
                  const newPath = selectedCategoryPath.slice(0, level);
                  if (value) {
                    newPath.push(value);
                  }
                  setSelectedCategoryPath(newPath);
                  for (let j = level + 1; j < 5; j++) {
                    form.setValue(`category_level_${j}` as any, '');
                  }
                }}
                value={selectedValue}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={level === 0 ? "Selecione a categoria principal" : "Selecione a subcategoria"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoriesAtLevel.map(cat => (
                    <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );
      currentParentSlug = selectedValue;
    }
    return selects;
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('latitude', position.coords.latitude);
          form.setValue('longitude', position.coords.longitude);
          showSuccess("Localização obtida com sucesso!");
          setIsLocating(false);
        },
        (err) => {
          console.warn(`WARN: ${err.message}`);
          showError("Não foi possível obter a localização. Verifique as permissões do navegador.");
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      showError("Geolocalização não é suportada pelo seu navegador.");
      setIsLocating(false);
    }
  };

  // REMOVIDO: Função para sugerir categoria
  // const handleSuggestCategory = async () => {
  //   const title = form.getValues('title');
  //   const description = form.getValues('description');

  //   if (!title || !description) {
  //     showError("Por favor, preencha o título e a descrição para sugerir uma categoria.");
  //     return;
  //   }

  //   setIsSuggestingCategory(true);
  //   const toastId = showLoading("Sugerindo categoria...");

  //   try {
  //     const { data, error } = await supabase.functions.invoke('suggest-category', {
  //       body: { title, description },
  //     });

  //     if (error) throw error;
  //     if (data?.error) throw new Error(data.error);

  //     const suggestedSlug = data.suggestedCategory;
  //     if (suggestedSlug) {
  //       // Encontra a categoria sugerida e seu caminho completo
  //       const category = allCategories?.find(c => c.slug === suggestedSlug);
  //       if (category) {
  //         const path: string[] = [];
  //         let currentSlug: string | null = category.slug;
  //         while (currentSlug) {
  //           path.unshift(currentSlug);
  //           const parentCategory = allCategories?.find(c => c.slug === currentSlug && c.parent_slug);
  //           currentSlug = parentCategory ? parentCategory.parent_slug : null;
  //         }
  //         setSelectedCategoryPath(path);
  //         showSuccess(`Categoria sugerida: ${category.name}`);
  //       } else {
  //         showError("A categoria sugerida não foi encontrada na lista.");
  //       }
  //     } else {
  //       showError("Não foi possível sugerir uma categoria.");
  //     }
  //   } catch (error) {
  //     showError(error instanceof Error ? error.message : "Erro ao sugerir categoria.");
  //   } finally {
  //     dismissToast(toastId);
  //     setIsSuggestingCategory(false);
  //   }
  // };

  async function onSubmit(values: z.infer<typeof adFormSchema>) {
    if (!user) {
      showError("Você precisa estar logado para criar um anúncio.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading("Publicando seu anúncio...");
    
    const finalImageUrls: string[] = [];
    const newImageFiles: File[] = [];
    const uploadedFilePaths: string[] = []; // Para rastrear uploads bem-sucedidos para limpeza

    // Separa as imagens em novas (File) e existentes (string)
    values.images.forEach(image => {
      if (typeof image === 'string') {
        finalImageUrls.push(image); // Já é um caminho relativo
      } else {
        newImageFiles.push(image);
      }
    });

    console.log("CreateAd: Starting image upload process.");
    console.log("CreateAd: New image files to upload:", newImageFiles.map(f => f.name));

    try {
      // Upload das novas imagens
      const uploadPromises = newImageFiles.map(file => {
        const fileName = `${user.id}/${Date.now()}-${Math.random()}-${file.name}`;
        console.log(`CreateAd: Attempting to upload file: ${file.name} to path: ${fileName}`);
        return supabase.storage.from("advertisements").upload(fileName, file);
      });

      const uploadResults = await Promise.all(uploadPromises);

      const uploadErrors = uploadResults.filter(result => result.error);
      if (uploadErrors.length > 0) {
        console.error("CreateAd: Errors during image upload:", uploadErrors);
        throw new Error(`Erro no upload de ${uploadErrors.length} imagem(ns): ${uploadErrors[0].error.message}`);
      }

      // Adiciona os caminhos das novas imagens à lista final e ao rastreador de uploads
      uploadResults.forEach(result => {
        if (result.data?.path) {
          finalImageUrls.push(result.data.path);
          uploadedFilePaths.push(result.data.path); // Rastreia para limpeza
          console.log(`CreateAd: Successfully uploaded: ${result.data.path}`);
        }
      });

      console.log("CreateAd: All images processed. Final image URLs (relative paths):", finalImageUrls);

      // Campos padrão que não devem ir para metadata
      const standardFields = ['title', 'description', 'price', 'images', 'latitude', 'longitude', 'category_slug', 'tags']; // NOVO: Adicionado 'tags'
      const metadata: { [key: string]: any } = {};
      for (const key in values) {
        // Adiciona campos dinâmicos (que não são padrão) ao metadata
        if (!standardFields.includes(key) && values[key] !== undefined && values[key] !== null && values[key] !== '') {
          metadata[key] = values[key];
        }
      }

      // NOVO: Processa as tags para o metadata
      if (values.tags) {
        metadata.tags = values.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }

      console.log("CreateAd: Inserting advertisement into database with payload:", {
        title: values.title,
        description: values.description,
        price: values.price,
        category_slug: values.category_slug,
        image_urls: finalImageUrls,
        user_id: user.id,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        latitude: values.latitude,
        longitude: values.longitude,
        status: 'approved',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const { error: insertError } = await supabase
        .from("advertisements")
        .insert({
          title: values.title,
          description: values.description,
          price: values.price,
          category_slug: values.category_slug,
          image_urls: finalImageUrls, // Usa a lista final de caminhos relativos
          user_id: user.id,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          latitude: values.latitude,
          longitude: values.longitude,
          status: 'approved',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Define a expiração para 30 dias
        });

      if (insertError) {
        console.error("CreateAd: Error inserting advertisement:", insertError);
        throw new Error(`Erro ao criar o anúncio: ${insertError.message}`);
      }
      console.log("CreateAd: Advertisement inserted successfully.");

      // Lógica para conceder bônus no primeiro anúncio
      const { count, error: adCountError } = await supabase
        .from("advertisements")
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (adCountError) {
        console.error("CreateAd: Erro ao contar anúncios do usuário para bônus:", adCountError);
      } else if (count === 1) {
        console.log("CreateAd: First ad detected, granting signup bonus.");
        const { error: creditsInsertError } = await supabase.from("user_credits").insert({ user_id: user.id, balance: 50 });
        if (creditsInsertError) throw creditsInsertError;

        const { error: transactionInsertError } = await supabase.from("credit_transactions").insert({ user_id: user.id, amount: 50, type: 'signup_bonus', description: 'Bônus de primeiro anúncio!' });
        if (transactionInsertError) throw transactionInsertError;
        
        dismissToast(toastId);
        showSuccess("Anúncio publicado e bônus de 50 créditos recebido!");
      } else {
        dismissToast(toastId);
        showSuccess("Anúncio publicado com sucesso!");
      }

      navigate(`/perfil`);
    } catch (error) {
      console.error("CreateAd: Caught error during submission:", error);
      // Em caso de erro, tenta remover as imagens que foram recém-enviadas
      if (uploadedFilePaths.length > 0) {
         await supabase.storage.from("advertisements").remove(uploadedFilePaths).catch(e => console.error("CreateAd: Erro ao limpar imagens após falha:", e));
      }
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
    } finally {
      setIsSubmitting(false);
      console.log("CreateAd: Submission process finished.");
    }
  }

  // Add top-level loading check here
  if (isLoadingCategories) {
    return (
      <Card className="max-w-2xl mx-auto">
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
      <CardHeader>
        <CardTitle>Criar Novo Anúncio</CardTitle>
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
                      onChange={(files) => {
                        console.log("CreateAd: MultiImageUploader onChange called. Files:", files);
                        field.onChange(files);
                      }}
                      maxFiles={MAX_FILES}
                      initialImageUrls={[]} // Para novos anúncios, não há imagens iniciais
                    />
                  </FormControl>
                   <FormDescription>
                    A primeira imagem será a capa do seu anúncio. Arraste para reordenar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {renderCategorySelects()}

            {/* Campo oculto para category_slug para que o Zod possa validá-lo */}
            <FormField
              control={form.control}
              name="category_slug"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
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
                  <FormControl><Input placeholder="Ex: iPhone 14 Pro Max" {...field} /></FormControl>
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
                  <FormControl><Textarea placeholder="Descreva seu produto em detalhes..." className="resize-y min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {categoryConfig.hasPriceFilter === true && (
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="Ex: 1500.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {categoryConfig.fields?.map((field: any) => (
              <FormField
                key={field.name}
                control={form.control}
                name={field.name}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>{field.label}</FormLabel>
                    {field.type === 'select' ? (
                      <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {field.options.map((option: string) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input
                          type={field.type}
                          placeholder={field.label}
                          {...formField}
                          onChange={e => {
                            const value = field.type === 'number' ? parseInt(e.target.value, 10) || '' : e.target.value;
                            formField.onChange(value);
                          }}
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            {/* REMOVIDO: Botão de Sugerir Categoria */}
            {/*
            <Button
              type="button"
              onClick={handleSuggestCategory}
              disabled={isSuggestingCategory || !form.getValues('title') || !form.getValues('description')}
              variant="outline"
              className="w-full"
            >
              {isSuggestingCategory ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sugerindo...
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" /> Sugerir Categoria
                </>
              )}
            </Button>
            */}

            {/* NOVO: Campo para Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags / Palavras-Chave (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: usado, semi-novo, urgente, promoção" {...field} />
                  </FormControl>
                  <FormDescription>
                    Separe as tags por vírgula. Elas ajudam outros usuários a encontrar seu anúncio.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium">Localização</h3>
              <p className="text-sm text-muted-foreground">
                Adicione sua localização para que seu anúncio seja encontrado por pessoas próximas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl><Input type="number" step="any" placeholder="Ex: -22.2222" {...field} disabled /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl><Input type="number" step="any" placeholder="Ex: -55.5555" {...field} disabled /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="button" onClick={handleGetLocation} disabled={isLocating}>
                {isLocating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Obtendo localização...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" /> Usar minha localização atual
                  </>
                )}
              </Button>
              {form.getValues('latitude') && form.getValues('longitude') && (
                <p className="text-sm text-muted-foreground">
                  Localização atual: {form.getValues('latitude')?.toFixed(4)}, {form.getValues('longitude')?.toFixed(4)}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando...
                </>
              ) : (
                "Publicar Anúncio"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateAd;