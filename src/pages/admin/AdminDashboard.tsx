import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, Users, Shapes, ArrowRight, CheckCheck, Handshake, MessagesSquare, XCircle, PauseCircle, CheckSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import AdsChart from "@/components/admin/AdsChart";
import { subDays, format, eachDayOfInterval, parseISO } from 'date-fns';
import AdminActivityFeed from "@/components/admin/AdminActivityFeed";
import RealtimeUsers from "@/components/admin/RealtimeUsers";
import ActionQueue from "@/components/admin/ActionQueue";

const fetchStats = async () => {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const { count: adCount, error: adError } = await supabase
    .from("advertisements")
    .select('*', { count: 'exact', head: true });

  const { count: pendingCount, error: pendingError } = await supabase
    .from("advertisements")
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_approval');
  
  const { count: soldCount, error: soldError } = await supabase
    .from("advertisements")
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold');

  const { count: rejectedCount, error: rejectedError } = await supabase
    .from("advertisements")
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected');
  
  const { count: pausedCount, error: pausedError } = await supabase
    .from("advertisements")
    .select('*', { count: 'exact', head: true })
    .eq('status', 'paused');

  const { count: userCount, error: userError } = await supabase
    .from("profiles")
    .select('*', { count: 'exact', head: true });

  const { count: categoryCount, error: categoryError } = await supabase
    .from("categories")
    .select('*', { count: 'exact', head: true });
  
  const { data: recentAds, error: recentAdsError } = await supabase
    .from("advertisements")
    .select("created_at")
    .gte("created_at", thirtyDaysAgo.toISOString());

  const { count: offerCount, error: offerError } = await supabase
    .from("offers")
    .select('*', { count: 'exact', head: true });

  const { count: conversationCount, error: conversationError } = await supabase
    .from("conversations")
    .select('*', { count: 'exact', head: true });

  const errors = [adError, userError, categoryError, pendingError, recentAdsError, offerError, conversationError, soldError, rejectedError, pausedError].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors.map(e => e?.message).join(', '));
  }

  const interval = eachDayOfInterval({ start: thirtyDaysAgo, end: new Date() });
  const adsByDay = interval.map(day => ({
    date: format(day, 'dd/MM'),
    count: 0,
  }));

  recentAds.forEach(ad => {
    const dateStr = format(parseISO(ad.created_at), 'dd/MM');
    const dayData = adsByDay.find(d => d.date === dateStr);
    if (dayData) {
      dayData.count++;
    }
  });

  return { adCount, userCount, categoryCount, pendingCount, adsByDay, offerCount, conversationCount, soldCount, rejectedCount, pausedCount };
};

const AdminDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: fetchStats,
  });

  const statsCards = [
    { title: "Anúncios Pendentes", value: data?.pendingCount, icon: CheckCheck, link: "/admin/moderation-center", className: "text-yellow-500" },
    { title: "Total de Ofertas", value: data?.offerCount, icon: Handshake, link: "#", className: "text-blue-500" },
    { title: "Total de Conversas", value: data?.conversationCount, icon: MessagesSquare, link: "#", className: "text-green-500" },
    { title: "Anúncios Vendidos", value: data?.soldCount, icon: CheckSquare, link: "/admin/ads", className: "text-purple-500" },
    { title: "Total de Anúncios", value: data?.adCount, icon: Newspaper, link: "/admin/ads" },
    { title: "Total de Usuários", value: data?.userCount, icon: Users, link: "/admin/users" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <RealtimeUsers />
        {statsCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 text-muted-foreground ${card.className || ''}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{card.value}</div>}
              {card.link !== "#" ? (
                <Link to={card.link} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary">
                  Gerenciar <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">Métrica de engajamento</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <AdsChart data={data?.adsByDay || []} />
        <ActionQueue />
      </div>
      <div className="mt-6">
        <AdminActivityFeed />
      </div>
    </div>
  );
};

export default AdminDashboard;