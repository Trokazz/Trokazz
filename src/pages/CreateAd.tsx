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
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import MultiImageUploader from "@/components/MultiImageUploader";
import { Skeleton } from "@/components/ui/skeleton"; // Importar Skeleton
import { useNavigate } from "react-router-dom"; // Adicionado: Importação do useNavigate

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Define o esquema base primeiro
const baseAdFormSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.coerce.number().positive("O preço deve ser um valor positivo.").optional(),
  images: z.array(z.instanceof(File))
    .min(1, "Pelo menos uma imagem é obrigatória.")
    .max(MAX_FILES, `Você pode enviar no máximo ${MAX_FILES} imagens.`)
    .refine(files => files.every(file => file.size <= MAX_FILE_SIZE), `Cada arquivo deve ter no máximo 5MB.`),
  // category_slug será definido dinamicamente e validado via superRefine
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).catchall(z.any()); // Permite campos dinâmicos para metadados

// Aplica superRefine ao esquema base para validações complexas
const adFormSchema = baseAdFormSchema.superRefine((data, ctx) => {
  const context = (ctx as any)._root?.options?.context || {};
  const category = context.categoryConfig || { hasPriceFilter: true, fields: [] };

  // Validação condicional para o preço
  if (category.hasPriceFilter !== false && (data.price === undefined || data.price === null || data.price <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Por favor, insira um preço válido e positivo para esta categoria.",
      path: ['price'],
    });
  }

  // Validação para garantir que uma categoria final foi selecionada
  if (!data.category_slug) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Por favor, selecione uma categoria.",
      path: ['category_slug'],
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
  const [categoryConfig, setCategoryConfig] = useState<any>({ hasPriceFilter: true, fields: [] });
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<string[]>([]);
  const [finalCategorySlug, setFinalCategorySlug] = useState<string>('');

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
      // category_slug não é um campo direto aqui, mas será definido via setValue
    },
    context: { categoryConfig }, // Passa categoryConfig para superRefine
  });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue('latitude', position.coords.latitude);
        form.setValue('longitude', position.coords.longitude);
      },
      (err) => {
        console.warn(`WARN: ${err.message}`);
      }
    );
  }, [form]);

  // Efeito para atualizar finalCategorySlug e categoryConfig com base no caminho selecionado
  useEffect(() => {
    if (selectedCategoryPath.length > 0) {
      const deepestSlug = selectedCategoryPath[selectedCategoryPath.length - 1];
      setFinalCategorySlug(deepestSlug);
      const currentCategory = allCategories?.find(c => c.slug === deepestSlug);
      setCategoryConfig(currentCategory?.custom_fields || { hasPriceFilter: true, fields: [] });
      // Define o valor do campo 'category_slug' no formulário para validação
      form.setValue('category_slug', deepestSlug, { shouldValidate: true });
    } else {
      setFinalCategorySlug('');
      setCategoryConfig({ hasPriceFilter: true, fields: [] });
      form.setValue('category_slug', '', { shouldValidate: true }); // Garante que o campo esteja vazio se nenhuma categoria for selecionada
    }
  }, [selectedCategoryPath, allCategories, form]);

  // Função para obter categorias filhas de um slug pai
  const getChildCategories = (parentSlug: string | null) => {
    return allCategories?.filter(cat => cat.parent_slug === parentSlug) || [];
  };

  // Renderiza os seletores de categoria dinamicamente
  const renderCategorySelects = () => {
    if (isLoadingCategories) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    let currentParentSlug: string | null = null;
    const selects = [];

    // Começa com a categoria principal (parent_slug = null)
    const initialCategories = getChildCategories(null);
    if (initialCategories.length === 0 && allCategories && allCategories.length > 0) {
      // Fallback: se não houver categorias top-level, mas houver categorias,
      // pode ser um problema de dados ou todas são subcategorias.
      // Para evitar tela em branco, podemos mostrar todas as categorias como top-level
      // ou um aviso. Por enquanto, vamos assumir que sempre haverá top-level.
      // Se não houver nenhuma categoria cadastrada, o seletor ficará vazio.
    }

    // Loop para renderizar seletores para cada nível
    for (let i = 0; i <= selectedCategoryPath.length; i++) {
      const categoriesAtLevel = getChildCategories(currentParentSlug);

      // Se não houver categorias neste nível e não for o primeiro seletor, pare de renderizar
      if (categoriesAtLevel.length === 0 && i > 0) {
        break;
      }

      const level = i;
      const selectedValue = selectedCategoryPath[level] || '';

      selects.push(
        <FormField
          key={`category-level-${level}`}
          control={form.control}
          // Usamos um nome de campo dummy para o form.control, pois o valor final é em finalCategorySlug
          name={`category_level_${level}` as any}
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
                  // Limpa os valores dos campos subsequentes no formulário
                  for (let j = level + 1; j < 5; j++) { // Assumindo um máximo de 5 níveis para limpeza
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

  async function onSubmit(values: z.infer<typeof adFormSchema>) {
    if (!user) {
      showError("Você precisa estar logado para criar um anúncio.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading("Publicando seu anúncio...");
    const uploadedImagePaths: string[] = [];

    try {
      const imageFiles = values.images;
      
      const uploadPromises = imageFiles.map(file => {
        const fileName = `${user.id}/${Date.now()}-${Math.random()}-${file.name}`;
        uploadedImagePaths.push(fileName);
        return supabase.storage.from("advertisements").upload(fileName, file);
      });

      const uploadResults = await Promise.all(uploadPromises);

      const uploadErrors = uploadResults.filter(result => result.error);
      if (uploadErrors.length > 0) {
        throw new Error(`Erro no upload de ${uploadErrors.length} imagem(ns): ${uploadErrors[0].error.message}`);
      }

      const imageUrls = uploadResults.map(result => {
        if (!result.data?.path) {
          throw new Error("Um caminho de imagem não foi retornado após o upload.");
        }
        return supabase.storage.from("advertisements").getPublicUrl(result.data.path).data.publicUrl;
      });

      // Campos padrão que não devem ir para metadata
      const standardFields = ['title', 'description', 'price', 'images', 'latitude', 'longitude', 'category_slug'];
      const metadata: { [key: string]: any } = {};
      for (const key in values) {
        // Adiciona campos dinâmicos (que não são padrão) ao metadata
        if (!standardFields.includes(key) && values[key] !== undefined && values[key] !== null && values[key] !== '') {
          metadata[key] = values[key];
        }
      }

      const { error: insertError } = await supabase
        .from("advertisements")
        .insert({
          title: values.title,
          description: values.description,
          price: values.price,
          category_slug: finalCategorySlug, // Usa a categoria mais específica selecionada
          image_urls: imageUrls,
          user_id: user.id,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          latitude: values.latitude,
          longitude: values.longitude,
          status: 'approved',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Define a expiração para 30 dias
        });

      if (insertError) throw new Error(`Erro ao criar o anúncio: ${insertError.message}`);

      // Lógica para conceder bônus no primeiro anúncio
      const { count, error: adCountError } = await supabase
        .from("advertisements")
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (adCountError) {
        console.error("Erro ao contar anúncios do usuário:", adCountError);
      } else if (count === 1) {
        // É o primeiro anúncio, então concede o bônus
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
      if (uploadedImagePaths.length > 0) {
        await supabase.storage.from("advertisements").remove(uploadedImagePaths);
      }
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
    } finally {
      setIsSubmitting(false);
    }
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
                      onChange={field.onChange}
                      maxFiles={MAX_FILES}
                    />
                  </FormControl>
                   <FormDescription>
                    A primeira imagem será a capa do seu anúncio.
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
                  <FormControl><Input {...field} value={finalCategorySlug} /></FormControl>
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
                  <FormControl><Textarea placeholder="Descreva seu produto em detalhes..." className="resize-y min-h-[120px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {categoryConfig.hasPriceFilter !== false && (
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Publicando..." : "Publicar Anúncio"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateAd;