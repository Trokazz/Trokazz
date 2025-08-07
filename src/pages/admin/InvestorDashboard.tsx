import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Newspaper, Handshake, MessagesSquare, Gem, BarChart2, PieChart, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar, BarChart } from 'recharts';
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const fetchInvestorData = async () => {
  const { data, error } = await supabase.rpc('get_investor_dashboard_data');
  if (error) throw new Error(error.message);
  return data;
};

const InvestorDashboard = () => {
  const { data, isLoading } = useQuery({
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
        </div>
      </div>
    </div>
  );
};

export default InvestorDashboard;