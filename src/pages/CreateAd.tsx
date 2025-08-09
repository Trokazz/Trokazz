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
import { useNavigate } from "react-router-dom";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import MultiImageUploader from "@/components/MultiImageUploader";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const adFormSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.coerce.number().positive("O preço deve ser um valor positivo.").optional(),
  images: z.array(z.instanceof(File))
    .min(1, "Pelo menos uma imagem é obrigatória.")
    .max(MAX_FILES, `Você pode enviar no máximo ${MAX_FILES} imagens.`)
    .refine(files => files.every(file => file.size <= MAX_FILE_SIZE), `Cada arquivo deve ter no máximo 5MB.`),
  category_slug: z.string({ required_error: "Por favor, selecione uma categoria." }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).catchall(z.any());

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("name, slug, custom_fields").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const CreateAd = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryConfig, setCategoryConfig] = useState<any>({ hasPriceFilter: true, fields: [] });
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const form = useForm<z.infer<typeof adFormSchema>>({
    resolver: zodResolver(adFormSchema),
    defaultValues: {
      title: "",
      description: "",
      images: [],
    },
  });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        form.setValue('latitude', position.coords.latitude);
        form.setValue('longitude', position.coords.longitude);
      },
      (err) => {
        console.warn(`WARN: ${err.message}`);
      }
    );
  }, [form]);

  const selectedCategorySlug = form.watch("category_slug");

  useEffect(() => {
    if (selectedCategorySlug && categories) {
      const category = categories.find(c => c.slug === selectedCategorySlug);
      const config = category?.custom_fields || { hasPriceFilter: true, fields: [] };
      setCategoryConfig(config);
    } else {
      setCategoryConfig({ hasPriceFilter: true, fields: [] });
    }
  }, [selectedCategorySlug, categories]);

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
      const imageUrls: string[] = [];

      for (const imageFile of imageFiles) {
        const fileName = `${user.id}/${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from("advertisements").upload(fileName, imageFile);
        if (uploadError) throw new Error(`Erro no upload da imagem: ${uploadError.message}`);
        
        uploadedImagePaths.push(fileName);
        const { data: { publicUrl } } = supabase.storage.from("advertisements").getPublicUrl(fileName);
        imageUrls.push(publicUrl);
      }

      const standardFields = ['title', 'description', 'price', 'images', 'category_slug', 'latitude', 'longitude'];
      const metadata: { [key: string]: any } = {};
      for (const key in values) {
        if (!standardFields.includes(key) && values[key]) {
          metadata[key] = values[key];
        }
      }

      const { error: insertError } = await supabase
        .from("advertisements")
        .insert({
          title: values.title,
          description: values.description,
          price: categoryConfig.hasPriceFilter !== false ? values.price : 0,
          category_slug: values.category_slug,
          image_urls: imageUrls,
          user_id: user.id,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          latitude: values.latitude,
          longitude: values.longitude,
        })
        .select()
        .single();

      if (insertError) throw new Error(`Erro ao criar o anúncio: ${insertError.message}`);

      dismissToast(toastId);
      showSuccess("Anúncio enviado para revisão!");
      navigate(`/perfil`);
    } catch (error) {
      // Se algo der errado, remove as imagens que já foram enviadas.
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

            <FormField
              control={form.control}
              name="category_slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map(cat => (
                        <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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