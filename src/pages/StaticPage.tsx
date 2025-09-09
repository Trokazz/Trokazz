import { useLocation } from 'react-router-dom'; // Import useLocation
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import MobilePageHeader from '@/components/MobilePageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DOMPurify from 'dompurify'; // Import DOMPurify

const fetchStaticPageContent = async (slug: string) => {
  const { data, error } = await supabase
    .from('pages')
    .select('title, content')
    .eq('slug', slug)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const StaticPage = () => {
  const location = useLocation(); // Use useLocation to get the current URL path
  const slug = location.pathname.substring(1); // Extract slug from pathname (e.g., "/privacy-policy" -> "privacy-policy")

  const { data: pageContent, isLoading, error } = useQuery({
    queryKey: ['staticPage', slug],
    queryFn: () => fetchStaticPageContent(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <MobilePageHeader title="Carregando..." />
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !pageContent) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 text-destructive">
        <MobilePageHeader title="Erro" />
        <p className="text-lg font-semibold">Não foi possível carregar o conteúdo da página.</p>
        <p className="text-sm text-muted-foreground">Verifique se a página '{slug}' foi criada no painel administrativo.</p>
      </div>
    );
  }

  // Sanitize the HTML content before rendering
  const sanitizedContent = DOMPurify.sanitize(pageContent.content || '<p>Nenhum conteúdo disponível para esta página.</p>');

  return (
    <div className="flex flex-col h-full bg-background">
      <MobilePageHeader title={pageContent.title || 'Página'} />
      <main className="flex-1 p-4">
        <Card>
          <CardHeader>
            <CardTitle>{pageContent.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StaticPage;