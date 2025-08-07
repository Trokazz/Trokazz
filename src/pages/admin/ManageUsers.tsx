import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, ShieldAlert, ArrowUp, ArrowDown } from "lucide-react";
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

const fetchUsersWithViolationCount = async ({ filters, sorting }: { filters: any, sorting: any }) => {
  let query = supabase.from("profiles").select("*");

  if (filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.role !== 'all') {
    query = query.eq('role', filters.role);
  }

  query = query.order(sorting.column, { ascending: sorting.order === 'asc' });

  const { data: profiles, error: profilesError } = await query;
  if (profilesError) throw new Error(profilesError.message);

  const userIds = profiles.map(p => p.id);
  if (userIds.length === 0) return [];

  const { data: violations, error: violationsError } = await supabase.from("violations").select("user_id").in("user_id", userIds);
  if (violationsError) throw new Error(violationsError.message);

  const violationCounts = violations.reduce((acc, v) => {
    acc[v.user_id] = (acc[v.user_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return profiles.map(p => ({ ...p, violationCount: violationCounts[p.id] || 0 }));
};

const ManageUsers = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: 'all', role: 'all' });
  const [sorting, setSorting] = useState({ column: 'created_at', order: 'desc' });

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
    const toastId = showLoading("Atualizando status de verificação...");
    try {
      const { error } = await supabase.from("profiles").update({ is_verified: isVerified }).eq("id", userId);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess("Status de verificação atualizado!");
      queryClient.invalidateQueries({ queryKey: ["allUsersWithViolations"] });
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao atualizar status.");
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-12" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                </TableRow>
              ))}
              {users?.map((user: any) => (
                <TableRow key={user.id}>
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
                    <Select value={user.role} onValueChange={(value) => handleRoleChange(user.id, value)}>
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ManageUsers;