import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, MessageSquare, Bug, Lightbulb, HelpCircle, CheckCircle, Clock, XCircle, ArrowUp, ArrowDown } from "lucide-react";
import { PaginationControls } from "@/components/PaginationControls";
import { useSearchParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TICKETS_PER_PAGE = 15;

type SupportTicket = {
  id: string;
  user_id: string | null;
  subject: string;
  message: string;
  type: 'question' | 'bug' | 'suggestion' | 'other';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  last_admin_reply_at: string | null;
  last_user_reply_at: string | null;
  profiles: { full_name: string | null; email: string | null; } | null;
};

const fetchSupportTickets = async ({ page, statusFilter, typeFilter, searchTerm, sorting }: { page: number; statusFilter: string; typeFilter: string; searchTerm: string; sorting: { column: string; order: 'asc' | 'desc' } }) => {
  let query = supabase
    .from("support_tickets")
    .select("id, subject, type, status, created_at, updated_at, profiles(full_name, email)", { count: 'exact' }) // Otimizado aqui
    .order(sorting.column, { ascending: sorting.order === 'asc' });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  if (typeFilter !== 'all') {
    query = query.eq('type', typeFilter);
  }
  if (searchTerm) {
    query = query.or(`subject.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`);
  }

  const from = (page - 1) * TICKETS_PER_PAGE;
  const to = from + TICKETS_PER_PAGE - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { tickets: data as SupportTicket[], count: count ?? 0 };
};

const ManageSupportTickets = () => {
  const [searchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page") || "1");
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<{ column: string; order: 'asc' | 'desc' }>({ column: 'created_at', order: 'desc' });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["supportTickets", currentPage, statusFilter, typeFilter, searchTerm, sorting],
    queryFn: () => fetchSupportTickets({ page: currentPage, statusFilter, typeFilter, searchTerm, sorting }),
  });

  const totalPages = data?.count ? Math.ceil(data.count / TICKETS_PER_PAGE) : 0;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'question': return <HelpCircle className="h-4 w-4 text-blue-500" />;
      case 'bug': return <Bug className="h-4 w-4 text-red-500" />;
      case 'suggestion': return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'other': return <MessageSquare className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge variant="destructive" className="bg-red-500">Novo</Badge>;
      case 'in_progress': return <Badge variant="secondary" className="bg-blue-500 text-white">Em Progresso</Badge>;
      case 'resolved': return <Badge variant="default" className="bg-green-500">Resolvido</Badge>;
      case 'closed': return <Badge variant="outline">Fechado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSort = (column: string) => {
    setSorting(prev => ({
      column,
      order: prev.column === column && prev.order === 'asc' ? 'desc' : 'asc'
    }));
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
        <CardTitle>Gestão de Suporte e Feedback</CardTitle>
        <CardDescription>
          Visualize e gerencie todas as mensagens de suporte e feedback dos usuários.
        </CardDescription>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="new">Novo</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="closed">Fechado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="question">Dúvida</SelectItem>
              <SelectItem value="bug">Problema/Bug</SelectItem>
              <SelectItem value="suggestion">Sugestão</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="search"
            placeholder="Buscar por assunto ou mensagem..."
            className="w-full sm:flex-grow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="subject" label="Assunto" />
                <TableHead>Usuário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <SortableHeader column="created_at" label="Criado Em" />
                <SortableHeader column="updated_at" label="Última Atualização" />
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                </TableRow>
              ))}
              {isError && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-red-500">
                    Erro ao carregar tickets: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && data?.tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum ticket encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {data?.tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium max-w-[200px] truncate" title={ticket.subject}>{ticket.subject}</TableCell>
                  <TableCell>
                    {ticket.profiles?.full_name || ticket.profiles?.email || 'Usuário Desconhecido'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getTypeIcon(ticket.type)}
                      <span className="capitalize">{ticket.type === 'question' ? 'Dúvida' : ticket.type === 'bug' ? 'Problema' : ticket.type === 'suggestion' ? 'Sugestão' : 'Outro'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell className="text-xs">{format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                  <TableCell className="text-xs">{format(new Date(ticket.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon">
                      <Link to={`/admin/support-tickets/${ticket.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
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

export default ManageSupportTickets;