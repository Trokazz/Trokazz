import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Import Button
import { Trash2, Loader2 } from "lucide-react"; // Import Trash2 and Loader2
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
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import { showError, showSuccess } from "@/utils/toast";

interface SystemLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  context: any;
  function_name: string | null;
}

const fetchSystemLogs = async () => {
  const { data, error } = await supabase
    .from('system_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100); // Limitar para os 100 logs mais recentes

  if (error) throw new Error(error.message);
  return data;
};

const deleteSystemLog = async (logId: string) => {
  const { error } = await supabase
    .from('system_logs')
    .delete()
    .eq('id', logId);
  if (error) throw new Error(error.message);
};

const SystemLogsPage = () => {
  const queryClient = useQueryClient();
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['systemLogs'],
    queryFn: fetchSystemLogs,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSystemLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemLogs'] });
      showSuccess("Log removido com sucesso!");
    },
    onError: (err: any) => {
      showError(err.message);
    },
  });

  const getLevelVariant = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'destructive';
      case 'warn': return 'secondary';
      case 'info': return 'default';
      default: return 'outline';
    }
  };

  const handleDeleteLog = (logId: string) => {
    deleteMutation.mutate(logId);
  };

  const isDeleting = deleteMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs do Sistema</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : error ? (
          <p className="text-destructive">Falha ao carregar logs: {error.message}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Contexto</TableHead>
                <TableHead className="text-right">Ações</TableHead> {/* Added Actions column */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                  <TableCell>
                    <Badge variant={getLevelVariant(log.level)}>
                      {log.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">{log.message}</TableCell>
                  <TableCell>{log.function_name || 'N/A'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {log.context ? JSON.stringify(log.context) : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isDeleting}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso removerá permanentemente este log do sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteLog(log.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Excluindo...
                              </>
                            ) : (
                              'Excluir'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemLogsPage;