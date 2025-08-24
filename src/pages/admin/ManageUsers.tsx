import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, ShieldAlert, ArrowUp, ArrowDown, Loader2 } from "lucide-react"; // Importar Loader2
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox"; // Importar Checkbox
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"; // Importar DropdownMenu

const fetchUsersWithViolationCount = async ({ filters, sorting }: { filters: any, sorting: any }) => {
  console.log("ManageUsers: Fetching users with filters:", filters, "and sorting:", sorting);
  let query = supabase.from("profiles").select("id, full_name, email, status, role, is_verified, created_at, user_level, reputation_score");

  if (filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.role !== 'all') {
    query = query.eq('role', filters.role);
  }
  // Novo filtro para status de verificação
  if (filters.isVerified !== 'all') {
    query = query.eq('is_verified', filters.isVerified === 'true');
  }

  query = query.order(sorting.column, { ascending: sorting.order === 'asc' });

  const { data: profiles, error: profilesError } = await query;
  if (profilesError) {
    console.error("ManageUsers: Error fetching profiles:", profilesError);
    throw new Error(profilesError.message);
  }
  console.log("ManageUsers: Profiles fetched:", profiles);

  const userIds = profiles.map(p => p.id);
  if (userIds.length === 0) return [];

  const { data: violations, error: violationsError } = await supabase.from("violations").select("user_id").in("user_id", userIds);
  if (violationsError) {
    console.error("ManageUsers: Error fetching violations:", violationsError);
    throw new Error(violationsError.message);
  }
  console.log("ManageUsers: Violations fetched:", violations);

  const violationCounts = violations.reduce((acc, v) => {
    acc[v.user_id] = (acc[v.user_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return profiles.map(p => ({ ...p, violationCount: violationCounts[p.id] || 0 }));
};

const ManageUsers = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: 'all', role: 'all', isVerified: 'all' }); // Adicionado isVerified
  const [sorting, setSorting] = useState({ column: 'created_at', order: 'desc' });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]); // Novo estado para seleção em massa
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false); // Novo estado de carregamento para ações em massa

  const { data: users, isLoading } = useQuery({
    queryKey: ["allUsersWithViolations", filters, sorting],
    queryFn: () => fetchUsersWithViolationCount({ filters, sorting }),
  });

  const handleSort = (column: string) => {
    setSorting(prev => ({
      column,
      order: prev.column === column && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const toastId = showLoading("Atualizando função...");
    try {
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess("Função do usuário atualizada!");
      queryClient.invalidateQueries({ queryKey: ["allUsersWithViolations"] });
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao atualizar função.");
    }
  };

  const handleVerificationChange = async (userId: string, isVerified: boolean) => {
    console.log(`ManageUsers: Attempting to update user ${userId} is_verified to ${isVerified}.`);
    const toastId = showLoading("Atualizando status de verificação...");
    try {
      const { error } = await supabase.from("profiles").update({ is_verified: isVerified }).eq("id", userId);
      if (error) throw new Error(error.message);
      console.log(`ManageUsers: Successfully updated user ${userId} is_verified to ${isVerified}.`);
      dismissToast(toastId);
      showSuccess("Status de verificação atualizado!");
      queryClient.invalidateQueries({ queryKey: ["allUsersWithViolations"] });
      queryClient.invalidateQueries({ queryKey: ["publicProfile"] }); // Invalida o cache de perfis públicos para refletir a mudança
      queryClient.invalidateQueries({ queryKey: ["verificationStatus", userId] }); // Invalida o status de verificação do usuário
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao atualizar status.");
      console.error(`ManageUsers: Error updating user ${userId} is_verified:`, error);
    }
  };

  // Lógica para seleção em massa
  const handleCheckboxChange = (userId: string, checked: boolean) => {
    setSelectedUserIds(prev => 
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(users?.map(user => user.id) || []);
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'suspend') => {
    if (selectedUserIds.length === 0) {
      showError("Nenhum usuário selecionado.");
      return;
    }

    setIsBulkActionLoading(true); // Ativa o estado de carregamento
    const toastId = showLoading(`Executando ação em ${selectedUserIds.length} usuários...`);
    try {
      const newStatus = action === 'activate' ? 'active' : 'suspended';
      const { error } = await supabase.from("profiles").update({ status: newStatus }).in("id", selectedUserIds);
      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Usuários ${action === 'activate' ? 'ativados' : 'suspensos'} com sucesso!`);
      setSelectedUserIds([]); // Limpar seleção
      queryClient.invalidateQueries({ queryKey: ["allUsersWithViolations"] });
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
        <CardTitle>Gerenciar Usuários</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.role} onValueChange={(value) => setFilters({ ...filters, role: value })}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Funções</SelectItem>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          {/* Novo filtro para status de verificação */}
          <Select value={filters.isVerified} onValueChange={(value) => setFilters({ ...filters, isVerified: value })}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por verificação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Verificado</SelectItem>
              <SelectItem value="false">Não Verificado</SelectItem>
            </SelectContent>
          </Select>
          {selectedUserIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto" disabled={isBulkActionLoading}>
                  {isBulkActionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                    </>
                  ) : (
                    `Ações em Massa (${selectedUserIds.length})`
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkAction('activate')} disabled={isBulkActionLoading}>Ativar Selecionados</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('suspend')} disabled={isBulkActionLoading}>Suspender Selecionados</DropdownMenuItem>
                {/* Ação de exclusão em massa de usuários é mais sensível e geralmente não é recomendada sem um fluxo de segurança robusto */}
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
                    checked={selectedUserIds.length === users?.length && (users?.length || 0) > 0}
                    onCheckedChange={(checked: boolean) => handleSelectAll(checked)}
                    disabled={!users || users.length === 0 || isBulkActionLoading}
                  />
                </TableHead>
                <SortableHeader column="full_name" label="Nome" />
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Verificado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-12" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                </TableRow>
              ))}
              {users?.map((user: any) => {
                console.log(`ManageUsers: Rendering user ${user.id} (${user.full_name || user.email}). is_verified: ${user.is_verified}`);
                return (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={(checked: boolean) => handleCheckboxChange(user.id, checked)}
                      disabled={isBulkActionLoading}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/users/${user.id}`} className="hover:underline">
                        {user.full_name || 'Não informado'}
                      </Link>
                      {user.violationCount > 0 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <ShieldAlert className="h-4 w-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{user.violationCount} advertência(s)</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email || 'Não informado'}</TableCell>
                  <TableCell>
                    {user.status === 'suspended' ? (
                      <Badge variant="destructive">Suspenso</Badge>
                    ) : (
                      <Badge variant="secondary">Ativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select value={user.role} onValueChange={(value) => handleRoleChange(user.id, value)} disabled={isBulkActionLoading}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`verified-${user.id}`}
                        checked={user.is_verified}
                        onCheckedChange={(checked) => handleVerificationChange(user.id, checked)}
                        disabled={isBulkActionLoading}
                      />
                      <Label htmlFor={`verified-${user.id}`} className="sr-only">Verificado</Label>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" disabled>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ManageUsers;