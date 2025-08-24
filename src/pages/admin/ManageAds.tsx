import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, Search, ArrowUp, ArrowDown, Loader2 } from "lucide-react"; // Importar Loader2
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
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useSearchParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from "@/components/PaginationControls";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getRelativePathFromUrlOrPath } from "@/lib/utils"; // Importar a nova função

const ADS_PER_PAGE = 20;

const fetchAllAds = async ({ filters, sorting, page }: { filters: any, sorting: any, page: number }) => {
  let query = supabase
    .from("advertisements")
    .select("id, title, price, created_at, image_urls, status, profiles(full_name)", { count: 'exact' }) // Otimizado aqui
    .order(sorting.column, { ascending: sorting.order === 'asc' });

  if (filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const from = (page - 1) * ADS_PER_PAGE;
  const to = from + ADS_PER_PAGE - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { ads: data, count: count ?? 0 };
};

const ManageAds = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ status: 'all' });
  const [sorting, setSorting] = useState({ column: 'created_at', order: 'desc' });
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false); // Novo estado de carregamento para ações em massa

  const currentPage = Number(searchParams.get("page") || "1");

  const { data, isLoading } = useQuery({
    queryKey: ["allAds", filters, sorting, currentPage],
    queryFn: () => fetchAllAds({ filters, sorting, page: currentPage }),
  });

  const totalPages = data?.count ? Math.ceil(data.count / ADS_PER_PAGE) : 0;

  const filteredAds = useMemo(() => {
    if (!data?.ads) return [];
    if (!searchTerm) return data.ads;
    return data.ads.filter(ad =>
      ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data?.ads, searchTerm]);

  const handleSort = (column: string) => {
    setSorting(prev => ({
      column,
      order: prev.column === column && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDeleteAd = async (adId: string, imageUrls: string[]) => {
    const toastId = showLoading("Excluindo anúncio...");
    try {
      if (imageUrls && imageUrls.length > 0) {
        // Converte as URLs públicas existentes para caminhos relativos antes de remover
        const imagePaths = imageUrls.map(url => getRelativePathFromUrlOrPath(url, 'advertisements')).filter(Boolean);
        if (imagePaths.length > 0) {
          await supabase.storage.from("advertisements").remove(imagePaths);
        }
      }
      const { error } = await supabase.from("advertisements").delete().eq("id", adId);
      if (error) throw new Error(error.message);

      dismissToast(toastId);
      showSuccess("Anúncio excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["allAds"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao excluir anúncio.");
    }
  };

  const handleCheckboxChange = (adId: string, checked: boolean) => {
    setSelectedAdIds(prev => 
      checked ? [...prev, adId] : prev.filter(id => id !== adId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAdIds(filteredAds.map(ad => ad.id));
    } else {
      setSelectedAdIds([]);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedAdIds.length === 0) {
      showError("Nenhum anúncio selecionado.");
      return;
    }

    setIsBulkActionLoading(true); // Ativa o estado de carregamento
    const toastId = showLoading(`Executando ação em ${selectedAdIds.length} anúncios...`);
    try {
      if (action === 'delete') {
        // Fetch image URLs for selected ads to delete from storage
        const { data: adsToDelete, error: fetchError } = await supabase
          .from('advertisements')
          .select('id, image_urls')
          .in('id', selectedAdIds);

        if (fetchError) throw fetchError;

        for (const ad of adsToDelete) {
          if (ad.image_urls && ad.image_urls.length > 0) {
            // Converte as URLs públicas existentes para caminhos relativos antes de remover
            const imagePaths = ad.image_urls.map(url => getRelativePathFromUrlOrPath(url, 'advertisements')).filter(Boolean);
            if (imagePaths.length > 0) {
              await supabase.storage.from("advertisements").remove(imagePaths);
            }
          }
        }
        const { error } = await supabase.from("advertisements").delete().in("id", selectedAdIds);
        if (error) throw error;
        showSuccess("Anúncios excluídos com sucesso!");
      } else {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const { error } = await supabase.from("advertisements").update({ status: newStatus }).in("id", selectedAdIds);
        if (error) throw error;
        showSuccess(`Anúncios ${action === 'approve' ? 'aprovados' : 'rejeitados'} com sucesso!`);
      }

      dismissToast(toastId);
      setSelectedAdIds([]); // Clear selection
      queryClient.invalidateQueries({ queryKey: ["allAds"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["moderationQueue"] }); // Invalidate moderation queue as well
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao executar ação em massa.");
    } finally {
      setIsBulkActionLoading(false); // Desativa o estado de carregamento
    }
  };

  const SortableHeader = ({ column, label }: { column: string, label: string }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => handleSort(column)} className="px-0">
        {label}
        {sorting.column === column && (
          sorting.order === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Anúncios</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por título ou usuário..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pending_approval">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="sold">Vendido</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
            </SelectContent>
          </Select>
          {selectedAdIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto" disabled={isBulkActionLoading}>
                  {isBulkActionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                    </>
                  ) : (
                    `Ações em Massa (${selectedAdIds.length})`
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkAction('approve')} disabled={isBulkActionLoading}>Aprovar Selecionados</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('reject')} disabled={isBulkActionLoading}>Rejeitar Selecionados</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('delete')} disabled={isBulkActionLoading} className="text-destructive">Excluir Selecionados</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedAdIds.length === filteredAds.length && (filteredAds.length || 0) > 0}
                    onCheckedChange={(checked: boolean) => handleSelectAll(checked)}
                    disabled={filteredAds.length === 0 || isBulkActionLoading}
                  />
                </TableHead>
                <SortableHeader column="title" label="Título" />
                <TableHead>Usuário</TableHead>
                <SortableHeader column="price" label="Preço" />
                <SortableHeader column="created_at" label="Data" />
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                </TableRow>
              ))}
              {filteredAds.map((ad: any) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedAdIds.includes(ad.id)}
                      onCheckedChange={(checked: boolean) => handleCheckboxChange(ad.id, checked)}
                      disabled={isBulkActionLoading}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{ad.title}</TableCell>
                  <TableCell>{ad.profiles?.full_name || 'N/A'}</TableCell>
                  <TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ad.price)}</TableCell>
                  <TableCell>{new Date(ad.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon">
                      <Link to={`/admin/ads/${ad.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o anúncio.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteAd(ad.id, ad.image_urls)}>
                            Sim, excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} />
      </CardContent>
    </Card>
  );
};

export default ManageAds;