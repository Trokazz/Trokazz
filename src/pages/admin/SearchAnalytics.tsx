import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const fetchSearchAnalytics = async () => {
  const { data, error } = await supabase.rpc('get_search_term_analytics');
  if (error) throw new Error(error.message);
  return data;
};

const SearchAnalyticsPage = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["searchAnalytics"],
    queryFn: fetchSearchAnalytics,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Buscas</CardTitle>
        <CardDescription>
          Os 100 termos mais pesquisados pelos usuários na plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Termo Buscado</TableHead>
              <TableHead className="text-right">Nº de Buscas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-5 w-12" /></TableCell>
              </TableRow>
            ))}
            {analytics?.map((item) => (
              <TableRow key={item.term}>
                <TableCell className="font-medium">{item.term}</TableCell>
                <TableCell className="text-right">{item.search_count}</TableCell>
              </TableRow>
            ))}
            {!isLoading && analytics?.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Nenhum dado de busca ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SearchAnalyticsPage;