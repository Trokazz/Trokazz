import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Info, Bug, Trash2, Loader2 } from "lucide-react";
import { PaginationControls } from "@/components/PaginationControls";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
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

const LOGS_PER_PAGE = 15;

type SystemLog = {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context: any;
  function_name: string | null;
};

const fetchSystemLogs = async ({ page, levelFilter, searchTerm }: { page: number; levelFilter: string; searchTerm: string }) => {
  let query = supabase
    .from("system_logs")
    .select("id, timestamp, level, message, function_name, context", { count: 'exact' })
    .order("timestamp", { ascending: false });

  if (levelFilter !== 'ALL') {
    query = query.eq('level', levelFilter);
  }
  if (searchTerm) {
    query = query.ilike('message', `%${searchTerm}%`);
  }

  const from = (page - 1) * LOGS_PER_PAGE;
  const to = from + LOGS_PER_PAGE - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { logs: data as SystemLog[], count: count ?? 0 };
};

const SystemLogs = () => {
  const [searchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page") || "1");
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeletingErrors, setIsDeletingErrors] = useState(false);
  const [isDeletingInfos, setIsDeletingInfos] = useState(false);
  const [isDeletingWarns, setIsDeletingWarns] = useState(false); // Novo estado para logs WARN
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["systemLogs", currentPage, levelFilter, searchTerm],
    queryFn: () => fetchSystemLogs({ page: currentPage, levelFilter, searchTerm }),
  });

  const totalPages = data?.count ? Math.ceil(data.count / LOGS_PER_PAGE) : 0;

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'INFO': return <Info className="h-4 w-4 text-blue-500" />;
      case 'WARN': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'ERROR': return <Bug className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'INFO': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'WARN': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'ERROR': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const handleDeleteLogs = async (levelToDelete: 'INFO' | 'WARN' | 'ERROR') => {
    if (levelToDelete === 'ERROR') setIsDeletingErrors(true);
    if (levelToDelete === 'INFO') setIsDeletingInfos(true);
    if (levelToDelete === 'WARN') setIsDeletingWarns(true); // Ativa o estado de carregamento para WARN

    const toastId = showLoading(`Apagando logs de ${levelToDelete}...`);
    try {
      const { error } = await supabase
        .from("system_logs")
        .delete()
        .eq('level', levelToDelete);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Todos os logs de ${levelToDelete} foram apagados com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["systemLogs"] });
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : `Não foi possível apagar os logs de ${levelToDelete}.`);
    } finally {
      if (levelToDelete === 'ERROR') setIsDeletingErrors(false);
      if (levelToDelete === 'INFO') setIsDeletingInfos(false);
      if (levelToDelete === 'WARN') setIsDeletingWarns(false); // Desativa o estado de carregamento para WARN
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs do Sistema</CardTitle>
        <CardDescription>
          Monitore eventos e erros importantes do backend da sua aplicação.
        </CardDescription>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Níveis</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="search"
            placeholder="Buscar por mensagem..."
            className="w-full sm:flex-grow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto" disabled={isDeletingErrors}>
                {isDeletingErrors ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Limpando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" /> Limpar Todos os Erros
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente todos os logs de nível "ERROR" do sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteLogs('ERROR')} disabled={isDeletingErrors}>
                  {isDeletingErrors ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Limpando...
                    </>
                  ) : (
                    "Sim, Limpar Erros"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto" disabled={isDeletingInfos}>
                {isDeletingInfos ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Limpando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" /> Limpar Logs INFO
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente todos os logs de nível "INFO" do sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteLogs('INFO')} disabled={isDeletingInfos}>
                  {isDeletingInfos ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Limpando...
                    </>
                  ) : (
                    "Sim, Limpar INFO"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* NOVO: Botão para limpar logs WARN */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" className="w-full sm:w-auto" disabled={isDeletingWarns}>
                {isDeletingWarns ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Limpando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" /> Limpar Logs WARN
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente todos os logs de nível "WARN" do sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteLogs('WARN')} disabled={isDeletingWarns}>
                  {isDeletingWarns ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Limpando...
                    </>
                  ) : (
                    "Sim, Limpar WARN"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Timestamp</TableHead>
                <TableHead className="w-[80px]">Nível</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="w-[150px]">Função</TableHead>
                <TableHead>Contexto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))}
              {isError && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-red-500">
                    Erro ao carregar logs: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && data?.logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum log encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {data?.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">
                    {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeClass(log.level)}`}>
                      {getLevelIcon(log.level)} {log.level}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{log.message}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.function_name || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.context ? JSON.stringify(log.context) : '-'}
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

export default SystemLogs;