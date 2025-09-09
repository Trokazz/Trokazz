import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CreditCard, Tag, Search, MessageSquare, Heart } from "lucide-react"; // Import MessageSquare and Heart
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { formatPrice } from "@/utils/formatters"; // Importando formatPrice

// Function to fetch main dashboard metrics
const fetchDashboardData = async () => {
  const { data, error } = await supabase.rpc('get_investor_dashboard_data');
  if (error) throw new Error(`Error fetching dashboard data: ${error.message}`);
  return data;
};

// Function to fetch sales analytics
const fetchAnalyticsData = async () => {
  const { data, error } = await supabase.rpc('get_credit_sales_analytics');
  if (error) throw new Error(`Error fetching analytics data: ${error.message}`);
  return data;
};

// Function to fetch popular search terms
const fetchPopularSearchTerms = async () => {
  const { data, error } = await supabase.rpc('get_search_term_analytics');
  if (error) throw new Error(`Error fetching popular search terms: ${error.message}`);
  return data;
};

const AdminDashboard = () => {
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['adminDashboardData'],
    queryFn: fetchDashboardData,
  });

  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['adminAnalyticsData'],
    queryFn: fetchAnalyticsData,
  });

  const { data: popularSearchTerms, isLoading: isLoadingSearchTerms } = useQuery({
    queryKey: ['popularSearchTerms'],
    queryFn: fetchPopularSearchTerms,
  });

  const isLoading = isLoadingDashboard || isLoadingAnalytics || isLoadingSearchTerms;

  const adsByStatusForPie = dashboardData?.ads_by_status?.map((item: any) => ({
    name: item.status,
    value: item.count,
  })) || [];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" /> {/* For new search terms card */}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Métricas Principais</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{dashboardData?.total_users?.toLocaleString()}</p>
              <div className="h-[80px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData?.users_per_month}>
                    <Line type="monotone" dataKey="new_users" stroke="#8884d8" strokeWidth={2} dot={false} />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Novos Usuários (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{dashboardData?.new_users_last_30_days?.toLocaleString()}</p>
              <div className="h-[80px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData?.users_per_month}>
                        <Bar dataKey="new_users" fill="#8884d8" />
                        <Tooltip />
                    </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Anúncios Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{dashboardData?.active_ads?.toLocaleString()}</p>
              <div className="h-[80px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={adsByStatusForPie} innerRadius={25} outerRadius={40} dataKey="value" paddingAngle={5}>
                            {adsByStatusForPie.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Métricas de Engajamento</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total de Ofertas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{dashboardData?.total_offers?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total de Conversas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{dashboardData?.total_conversations?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total de Mensagens</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              <p className="text-3xl font-bold">{dashboardData?.total_messages?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total de Favoritos</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Heart className="h-8 w-8 text-red-500" />
              <p className="text-3xl font-bold">{dashboardData?.total_favorites?.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Gerenciamento Rápido</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/admin/users">
              <Card className="flex flex-col items-center justify-center p-6 hover:bg-secondary transition-colors">
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <p className="font-semibold">Gerenciar Usuários</p>
              </Card>
            </Link>
            <Link to="/admin/ads">
              <Card className="flex flex-col items-center justify-center p-6 hover:bg-secondary transition-colors">
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <p className="font-semibold">Gerenciar Anúncios</p>
              </Card>
            </Link>
            <Link to="/admin/payments">
              <Card className="flex flex-col items-center justify-center p-6 hover:bg-secondary transition-colors">
                  <CreditCard className="h-8 w-8 text-primary mb-2" />
                  <p className="font-semibold">Pagamentos</p>
              </Card>
            </Link>
            <Link to="/admin/prometter/vouchers">
              <Card className="flex flex-col items-center justify-center p-6 hover:bg-secondary transition-colors">
                  <Tag className="h-8 w-8 text-primary mb-2" />
                  <p className="font-semibold">Vouchers</p>
              </Card>
            </Link>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Métricas Detalhadas</h2>
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Anúncios Publicados (30d)</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboardData?.ads_published_last_30_days_by_day}>
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="new_ads" stroke="#82ca9d" name="Novos Anúncios" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Receita Mensal</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData?.revenue_per_month}>
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(value) => formatPrice(value)} />
                            <Tooltip formatter={(value: number) => formatPrice(value)} />
                            <Bar dataKey="total_cents" fill="#ffc658" name="Receita" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Pacotes de Crédito Mais Vendidos</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData?.top_packages_sold}>
                            <XAxis dataKey="package_description" angle={-45} textAnchor="end" height={60} />
                            <YAxis />
                            <Tooltip formatter={(value: number) => value.toLocaleString()} />
                            <Bar dataKey="sales_count" fill="#82ca9d" name="Vendas" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Termos de Busca Populares</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] overflow-y-auto">
                    {popularSearchTerms && popularSearchTerms.length > 0 ? (
                        <ul className="space-y-2">
                            {popularSearchTerms.map((item: any, index: number) => (
                                <li key={index} className="flex justify-between items-center text-sm">
                                    <span className="font-medium flex items-center gap-2">
                                        <Search className="h-4 w-4 text-muted-foreground" /> {item.term}
                                    </span>
                                    <span className="text-muted-foreground">{item.search_count} buscas</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">Nenhum termo de busca popular ainda.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;