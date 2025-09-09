import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Edit, Eye, Loader2, Ban, CheckCircle, UserX, UserCheck, ArrowUpDown } from "lucide-react"; // Import ArrowUpDown
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { showError, showSuccess } from "@/utils/toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import useDebounce from "@/hooks/useDebounce";
import { useInView } from 'react-intersection-observer';
import { cn } from "@/lib/utils"; // Import cn for dynamic class names

// Schema for user profile data
const userProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1, "Nome completo é obrigatório."),
  email: z.string().email("E-mail inválido."),
  role: z.enum(["user", "admin"], { required_error: "Função é obrigatória." }),
  status: z.enum(["active", "suspended"], { required_error: "Status é obrigatório." }),
  is_verified: z.boolean(),
});

type UserProfileFormData = z.infer<typeof userProfileSchema>;

interface UserFilters {
  searchTerm: string;
  role: string | null;
  status: string | null;
  isVerified: boolean | null;
  sortBy: string; // New: column to sort by
  sortOrder: 'asc' | 'desc'; // New: sort order
}

// Modificado para aceitar pageParam e pageSize
const fetchUsers = async ({ pageParam = 0, pageSize = 20, filters }: { pageParam?: number; pageSize?: number; filters: UserFilters; }) => {
  const offset = pageParam * pageSize;
  let query = supabase
    .from('profiles')
    .select('*, user_levels(level_name)', { count: 'exact' }); // Select user_levels to display level_name

  if (filters.searchTerm) {
    query = query.or(`full_name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%`);
  }
  if (filters.role) {
    query = query.eq('role', filters.role);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.isVerified !== null) {
    query = query.eq('is_verified', filters.isVerified);
  }

  // Apply dynamic sorting
  if (filters.sortBy === 'user_level') {
    // Sorting by a joined table column requires a different approach or a view/function
    // For simplicity, we'll sort by full_name if user_level is selected for now,
    // or you can create a custom RPC function in Supabase for complex joins/sorts.
    query = query.order('full_name', { ascending: filters.sortOrder === 'asc' });
  } else {
    query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
  }


  query = query.range(offset, offset + pageSize - 1); // Aplica o range para paginação

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const hasMore = (count || 0) > (offset + (data?.length || 0));
  return { users: data || [], nextPage: hasMore ? pageParam + 1 : undefined };
};

// Função para atualizar o perfil do usuário
const updateProfile = async (formData: UserProfileFormData) => {
  const { id, full_name, email, role, status, is_verified } = formData;

  // Atualiza a tabela 'profiles'
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name, role, status, is_verified })
    .eq('id', id);

  if (profileError) {
    throw new Error(`Erro ao atualizar perfil: ${profileError.message}`);
  }

  // Opcional: Se o email também puder ser editado, você precisaria de uma função de admin para isso
  // ou um fluxo de verificação de email separado para o usuário.
  // Por enquanto, o email não é atualizado aqui.

  return formData;
};


const ManageUsersPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfileFormData | null>(null);
  const { ref, inView } = useInView(); // Para o gatilho de scroll infinito

  const [filters, setFilters] = useState<UserFilters>({
    searchTerm: searchParams.get('q') || '',
    role: searchParams.get('role') || null,
    status: searchParams.get('status') || null,
    isVerified: searchParams.get('isVerified') === 'true' ? true : searchParams.get('isVerified') === 'false' ? false : null,
    sortBy: searchParams.get('sortBy') || 'created_at', // Default sort
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc', // Default order
  });
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingUsers, // isLoading para o carregamento inicial
    error,
  } = useInfiniteQuery({
    queryKey: ['adminUsers', debouncedSearchTerm, filters.role, filters.status, filters.isVerified, filters.sortBy, filters.sortOrder],
    queryFn: ({ pageParam }) => fetchUsers({ pageParam, filters: {
      searchTerm: debouncedSearchTerm,
      role: filters.role,
      status: filters.status,
      isVerified: filters.isVerified,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    }}),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Efeito para atualizar os estados dos filtros quando os parâmetros de busca da URL mudam
  useEffect(() => {
    const searchTermParam = searchParams.get('q') || '';
    const roleParam = searchParams.get('role') || null;
    const statusParam = searchParams.get('status') || null;
    const isVerifiedParam = searchParams.get('isVerified') === 'true' ? true : searchParams.get('isVerified') === 'false' ? false : null;
    const sortByParam = searchParams.get('sortBy') || 'created_at';
    const sortOrderParam = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    setFilters(prevFilters => {
      if (
        prevFilters.searchTerm === searchTermParam &&
        prevFilters.role === roleParam &&
        prevFilters.status === statusParam &&
        prevFilters.isVerified === isVerifiedParam &&
        prevFilters.sortBy === sortByParam &&
        prevFilters.sortOrder === sortOrderParam
      ) {
        return prevFilters;
      }
      return {
        searchTerm: searchTermParam,
        role: roleParam,
        status: statusParam,
        isVerified: isVerifiedParam,
        sortBy: sortByParam,
        sortOrder: sortOrderParam,
      };
    });
  }, [searchParams]);

  // Efeito para atualizar a URL quando os filtros mudam
  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    if (filters.searchTerm) newSearchParams.set('q', filters.searchTerm);
    if (filters.role) newSearchParams.set('role', filters.role);
    if (filters.status) newSearchParams.set('status', filters.status);
    if (filters.isVerified !== null) newSearchParams.set('isVerified', String(filters.isVerified));
    if (filters.sortBy !== 'created_at') newSearchParams.set('sortBy', filters.sortBy);
    if (filters.sortOrder !== 'desc') newSearchParams.set('sortOrder', filters.sortOrder);
    setSearchParams(newSearchParams, { replace: true });
  }, [filters, setSearchParams]);

  // Gatilho para o scroll infinito
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showSuccess("Perfil do usuário atualizado com sucesso!");
      setIsDialogOpen(false);
      setSearchParams({});
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showSuccess(`Usuário ${variables.userId} ${newStatus === 'active' ? 'ativado' : 'suspenso'} com sucesso!`);
    },
    onError: (err: any) => showError(err.message),
  });

  const toggleUserVerificationMutation = useMutation({
    mutationFn: async ({ userId, currentIsVerified }: { userId: string; currentIsVerified: boolean }) => {
      const newIsVerified = !currentIsVerified;
      const { error } = await supabase.from('profiles').update({ is_verified: newIsVerified }).eq('id', userId);
      if (error) throw error;
      return newIsVerified;
    },
    onSuccess: (newIsVerified, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showSuccess(`Usuário ${variables.userId} ${newIsVerified ? 'verificado' : 'desverificado'} com sucesso!`);
    },
    onError: (err: any) => showError(err.message),
  });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
  });

  useEffect(() => {
    const editUserId = searchParams.get('edit');
    if (editUserId && data?.pages) {
      const allUsers = data.pages.flatMap(page => page.users);
      const userToEdit = allUsers.find(u => u.id === editUserId);
      if (userToEdit) {
        handleEditUser(userToEdit);
      } else {
        setSearchParams({});
      }
    }
  }, [searchParams, data]); // Removed 'reset' from dependencies

  const handleEditUser = (user: any) => {
    setCurrentUser(user);
    reset({
      id: user.id,
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'user',
      status: user.status || 'active',
      is_verified: user.is_verified || false,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: UserProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSearchParams({});
  };

  const handleSort = (column: string) => {
    if (filters.sortBy === column) {
      setFilters(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }));
    } else {
      setFilters(prev => ({ ...prev, sortBy: column, sortOrder: 'asc' }));
    }
  };

  const isFormDisabled = isSubmitting || updateProfileMutation.isPending;
  const allUsers = data?.pages.flatMap(page => page.users) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Usuários</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Input
            placeholder="Buscar por nome ou email..."
            className="flex-1 min-w-[200px]"
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
          />
          <Select
            onValueChange={(value) => setFilters(prev => ({ ...prev, role: value === 'all' ? null : value }))}
            value={filters.role || 'all'}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por Função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Funções</SelectItem>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? null : value }))}
            value={filters.status || 'all'}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => setFilters(prev => ({ ...prev, isVerified: value === 'all' ? null : value === 'true' }))}
            value={filters.isVerified === true ? 'true' : filters.isVerified === false ? 'false' : 'all'}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por Verificação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Verificado</SelectItem>
              <SelectItem value="false">Não Verificado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <p className="text-destructive">Falha ao carregar usuários.</p>
        ) : (allUsers.length > 0) ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center">
                      Nome
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", filters.sortBy === 'full_name' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('email')}>
                    <div className="flex items-center">
                      Email
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", filters.sortBy === 'email' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", filters.sortBy === 'status' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('role')}>
                    <div className="flex items-center">
                      Função
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", filters.sortBy === 'role' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('is_verified')}>
                    <div className="flex items-center">
                      Verificado
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", filters.sortBy === 'is_verified' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('user_level')}>
                    <div className="flex items-center">
                      Nível
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", filters.sortBy === 'user_level' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center">
                      Data de Cadastro
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", filters.sortBy === 'created_at' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_verified ? 'default' : 'secondary'}>
                        {user.is_verified ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell>{(user.user_levels as any)?.level_name || 'N/A'}</TableCell> {/* Display user level */}
                    <TableCell>{format(new Date(user.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${user.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleUserStatusMutation.mutate({ userId: user.id, currentStatus: user.status })}
                        disabled={toggleUserStatusMutation.isPending}
                      >
                        {toggleUserStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (user.status === 'active' ? <Ban className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />)}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleUserVerificationMutation.mutate({ userId: user.id, currentIsVerified: user.is_verified })}
                        disabled={toggleUserVerificationMutation.isPending}
                      >
                        {toggleUserVerificationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (user.is_verified ? <UserX className="h-4 w-4 text-orange-500" /> : <UserCheck className="h-4 w-4 text-blue-500" />)}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div ref={ref} className="col-span-full text-center py-4">
              {isFetchingNextPage && <p>Carregando mais usuários...</p>}
              {!hasNextPage && allUsers.length > 0 && <p>Você viu todos os usuários!</p>}
            </div>
          </>
        ) : isLoadingUsers ? ( // Use isLoadingUsers para o carregamento inicial
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <p className="text-center text-muted-foreground p-8">
            Nenhum usuário encontrado com os filtros aplicados.
          </p>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("id")} />
            <div>
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input id="full_name" {...register("full_name")} disabled={isFormDisabled} />
              {errors.full_name && <p className="text-destructive text-sm">{errors.full_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register("email")} disabled={isFormDisabled} />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="role">Função</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}>
                    <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-destructive text-sm">{errors.role.message}</p>}
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}>
                    <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <p className="text-destructive text-sm">{errors.status.message}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                name="is_verified"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="is_verified"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isFormDisabled}
                  />
                )}
              />
              <Label htmlFor="is_verified">Verificado</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isFormDisabled}>Cancelar</Button>
              <Button type="submit" disabled={isFormDisabled}>
                {isFormDisabled ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ManageUsersPage;