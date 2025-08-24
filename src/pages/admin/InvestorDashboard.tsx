import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Newspaper, Handshake, MessagesSquare, Gem, BarChart2, PieChart, Download, DollarSign, Package } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar, BarChart } from 'recharts';
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Definindo tipos para os dados retornados pela função RPC get_investor_dashboard_data
interface DashboardMetrics {
  total_users: number;
  total_ads: number;
  total_offers: number;
  total_conversations: number;
  total_credits_spent: number;
  ads_by_status: { status: string; count: number }[];
  users_per_month: { month: string; new_users: number }[];
}

// Definindo tipos para os dados retornados pela função RPC get_credit_sales_analytics
interface CreditSalesMetrics {
  total_revenue_in_cents: number;
  revenue_per_month: { month: string; total_cents: number }[];
  top_packages_sold: { package_description: string; sales_count: number; total_cents_sold: number }[];
}

// Combinando os tipos para o objeto final retornado por fetchInvestorData
type CombinedInvestorData = DashboardMetrics & {
  creditSales: CreditSalesMetrics;
};

const fetchInvestorData = async (): Promise<CombinedInvestorData> => {
  const { data: dashboardDataRaw, error: dashboardError } = await supabase.rpc('get_investor_dashboard_data');
  if (dashboardError) throw new Error(dashboardError.message);

  const { data: creditSalesData, error: creditSalesError } = await supabase.rpc('get_credit_sales_analytics');
  if (creditSalesError) throw new Error(creditSalesError.message);

  // Corrigido: Fazendo o cast explícito para unknown antes de DashboardMetrics
  const dashboardMetrics = dashboardDataRaw as unknown as DashboardMetrics;
  // Corrigido: Fazendo o cast explícito para unknown antes de CreditSalesMetrics
  const creditSalesMetrics = creditSalesData as unknown as CreditSalesMetrics;

  return { ...dashboardMetrics, creditSales: creditSalesMetrics };
};

const InvestorDashboard = () => {
  const { data, isLoading } = useQuery<CombinedInvestorData>({
    queryKey: ["investorDashboard"],
    queryFn: fetchInvestorData,
  });
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'png' | 'pdf') => {
    if (!dashboardRef.current) return;
    setIsExporting(true);

    const canvas = await html2canvas(dashboardRef.current, {
      useCORS: true,
      backgroundColor: null, // Use page background
    });

    if (format === 'png') {
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = 'dashboard_investidor_trokazz.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape, mm, a4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const width = pdfWidth;
      const height = width / ratio;
      
      // Se a altura for maior que a página, ajustamos pela altura
      if (height > pdfHeight) {
        const newHeight = pdfHeight;
        const newWidth = newHeight * ratio;
        pdf.addImage(imgData, 'JPEG', (pdfWidth - newWidth) / 2, 0, newWidth, newHeight);
      } else {
        pdf.addImage(imgData, 'JPEG', 0, (pdfHeight - height) / 2, width, height);
      }
      
      pdf.save('dashboard_investidor_trokazz.pdf');
    }

    setIsExporting(false);
  };

  const kpiCards = [
    { title: "Total de Usuários", value: data?.total_users, icon: Users },
    { title: "Total de Anúncios", value: data?.total_ads, icon: Newspaper },
    { title: "Total de Ofertas", value: data?.total_offers, icon: Handshake },
    { title: "Total de Conversas", value: data?.total_conversations, icon: MessagesSquare },
    { title: "Créditos Gastos (Boosts)", value: data?.total_credits_spent, icon: Gem },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Investor Dashboard</h1>
          <p className="text-muted-foreground">
            Um resumo das métricas de crescimento e engajamento da plataforma.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('png')} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Gerando...' : 'Exportar Imagem'}
          </Button>
          <Button onClick={() => handleExport('pdf')} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Gerando...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      <div ref={dashboardRef} className="bg-background p-4 rounded-lg">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {kpiCards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{card.value?.toLocaleString('pt-BR') || 0}</div>}
              </CardContent>
            </Card>
          ))}
          {/* New KPI Card for Total Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total (Créditos)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{formatCurrency(data?.creditSales?.total_revenue_in_cents || 0)}</div>}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" /> Crescimento de Usuários (Mensal)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.users_per_month}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="new_users" name="Novos Usuários" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" /> Distribuição de Anúncios por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.ads_by_status}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Quantidade" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          {/* New Chart for Revenue per Month */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Receita de Créditos (Mensal)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.creditSales?.revenue_per_month}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => [typeof value === 'number' ? formatCurrency(value) : value, "Receita"]} />
                    <Legend />
                    <Line type="monotone" dataKey="total_cents" name="Receita" stroke="#FFBB28" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          {/* New Chart for Top Selling Packages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Pacotes de Crédito Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.creditSales?.top_packages_sold}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="package_description" angle={-45} textAnchor="end" height={80} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value, name, props) => {
                        if (name === 'sales_count') return [`${value} vendas`, "Vendas"];
                        if (name === 'total_cents_sold') return [typeof value === 'number' ? formatCurrency(value) : value, "Receita"];
                        return [value, name];
                    }} />
                    <Legend />
                    <Bar dataKey="sales_count" name="Vendas" fill="#82ca9d" />
                    <Bar dataKey="total_cents_sold" name="Receita" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InvestorDashboard;