import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, Bug, Lightbulb, HelpCircle } from "lucide-react";
import { Database } from "@/types/supabase"; // Importar o tipo Database

// Usando o tipo gerado pelo Supabase para garantir compatibilidade
type SupportTicket = Database['public']['Tables']['support_tickets']['Row'];

const fetchUserTickets = async (userId: string): Promise<SupportTicket[]> => {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
};

const UserSupportTickets = () => {
  const { user } = useSession();
  const { data: tickets, isLoading, isError, error } = useQuery<SupportTicket[]>({
    queryKey: ["userSupportTickets", user?.id],
    queryFn: () => fetchUserTickets(user!.id),
    enabled: !!user,
  });

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

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError) {
    return <p className="text-red-500 text-center py-4">Erro ao carregar seus tickets: {error.message}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus Tickets de Suporte</CardTitle>
        <CardDescription>Acompanhe o status das suas solicitações e feedbacks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assunto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Você ainda não abriu nenhum ticket de suporte.
                  </TableCell>
                </TableRow>
              ) : (
                tickets?.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={ticket.subject}>{ticket.subject}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(ticket.type)}
                        <span className="capitalize">{ticket.type === 'question' ? 'Dúvida' : ticket.type === 'bug' ? 'Problema' : ticket.type === 'suggestion' ? 'Sugestão' : 'Outro'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-xs">{format(new Date(ticket.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                    <TableCell className="text-right">
                      <Link to={`/perfil/support-tickets/${ticket.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserSupportTickets;