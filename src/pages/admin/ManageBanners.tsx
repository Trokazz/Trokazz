import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { safeFormatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const bannerSchema = z.object({
  title: z.string().min(1, "O título é obrigatório."),
  description: z.string().optional(),
  image: z.instanceof(FileList).optional(),
  link_url: z.string().url("URL inválida.").optional().or(z.literal('')),
  button_text: z.string().optional(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  background_color: z.string().optional(),
  text_color: z.string().optional(),
});

type Banner = { id: string; title: string; is_active: boolean; starts_at: string | null; ends_at: string | null; image_url: string; description: string | null; link_url: string | null; button_text: string | null; background_color: string | null; text_color: string | null; };

const fetchBanners = async () => {
  const { data, error } = await supabase.from("banners").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return "";
  }
};

const ManageBanners = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const { data: banners, isLoading } = useQuery({
    queryKey: ["allBanners"],
    queryFn: fetchBanners,
  });

  const form = useForm<z.infer<typeof bannerSchema>>({
    resolver: zodResolver(bannerSchema),
  });

  const handleOpenDialog = (banner: Banner | null = null) => {
    setEditingBanner(banner);
    form.reset({
      title: banner?.title || "",
      description: banner?.description || "",
      link_url: banner?.link_url || "",
      button_text: banner?.button_text || "",
      starts_at: banner?.starts_at ? formatDateForInput(banner.starts_at) : "",
      ends_at: banner?.ends_at ? formatDateForInput(banner.ends_at) : "",
      is_active: banner?.is_active ?? true,
      background_color: banner?.background_color || "#f1f5f9",
      text_color: banner?.text_color || "#0f172a",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof bannerSchema>) => {
    const toastId = showLoading(editingBanner ? "Atualizando banner..." : "Criando banner...");
    try {
      let imageUrl = editingBanner?.image_url;
      const imageFile = values.image?.[0];

      if (imageFile) {
        const fileName = `${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from("banners").upload(fileName, imageFile, { upsert: true });
        if (uploadError) throw new Error(uploadError.message);
        imageUrl = supabase.storage.from("banners").getPublicUrl(fileName).data.publicUrl;
      }

      if (!imageUrl && !editingBanner) {
        throw new Error("A imagem é obrigatória para criar um novo banner.");
      }

      const payload = { ...values, image_url: imageUrl, starts_at: values.starts_at || null, ends_at: values.ends_at || null };
      delete (payload as any).image;

      const { error } = editingBanner
        ? await supabase.from("banners").update(payload).eq("id", editingBanner.id)
        : await supabase.from("banners").insert(payload);

      if (error) throw new Error(error.message);

      dismissToast(toastId);
      showSuccess(`Banner ${editingBanner ? "atualizado" : "criado"} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["allBanners"] });
      queryClient.invalidateQueries({ queryKey: ["promoBanners"] });
      setIsDialogOpen(false);
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  const handleDelete = async (banner: Banner) => {
    const toastId = showLoading("Excluindo banner...");
    try {
      const { error } = await supabase.from("banners").delete().eq("id", banner.id);
      if (error) throw new Error(error.message);
      
      const imagePath = banner.image_url.split('/banners/')[1];
      if (imagePath) await supabase.storage.from("banners").remove([imagePath]);

      dismissToast(toastId);
      showSuccess("Banner excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["allBanners"] });
      queryClient.invalidateQueries({ queryKey: ["promoBanners"] });
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Ocorreu um erro.");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gerenciar Banners</CardTitle>
          <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Novo Banner</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Status</TableHead><TableHead>Período</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}
              {banners?.map((banner: Banner) => (
                <TableRow key={banner.id}>
                  <TableCell className="font-medium">{banner.title}</TableCell>
                  <TableCell><Badge variant={banner.is_active ? "default" : "outline"}>{banner.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell>{safeFormatDate(banner.starts_at, "dd/MM/yy")} - {safeFormatDate(banner.ends_at, "dd/MM/yy") || "Sem Fim"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(banner)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(banner)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingBanner ? "Editar" : "Novo"} Banner</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="button_text" render={({ field }) => (<FormItem><FormLabel>Texto do Botão</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="link_url" render={({ field }) => (<FormItem><FormLabel>URL do Link</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="image" render={() => (<FormItem><FormLabel>Imagem</FormLabel><FormControl><Input type="file" accept="image/*" {...form.register("image")} /></FormControl><FormDescription className="text-xs">Recomendamos o tamanho 1200x400 pixels.</FormDescription><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="background_color" render={({ field }) => (<FormItem><FormLabel>Cor de Fundo</FormLabel><FormControl><Input type="color" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="text_color" render={({ field }) => (<FormItem><FormLabel>Cor do Texto</FormLabel><FormControl><Input type="color" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="starts_at" render={({ field }) => (<FormItem><FormLabel>Início da Exibição</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="ends_at" render={({ field }) => (<FormItem><FormLabel>Fim da Exibição</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="is_active" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Ativo</FormLabel><FormDescription>Controla se o banner está visível.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManageBanners;