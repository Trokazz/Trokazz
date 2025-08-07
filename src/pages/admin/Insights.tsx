import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, format, eachDayOfInterval, parseISO } from 'date-fns';
import CategoryDistributionChart from "@/components/admin/CategoryDistributionChart";
import UserGrowthChart from "@/components/admin/UserGrowthChart";

const fetchInsightsData = async () => {
  const thirtyDaysAgo = subDays(new Date(), 30);

  // 1. Fetch category distribution data
  const { data: ads, error: adsError } = await supabase
    .from("advertisements")
    .select("category_slug")
    .not("category_slug", "is", null);
  
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("slug, name");

  if (adsError || categoriesError) {
    throw new Error(adsError?.message || categoriesError?.message);
  }

  const adCounts = ads.reduce((acc, ad) => {
    acc[ad.category_slug!] = (acc[ad.category_slug!] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryDistribution = categories.map(cat => ({
    name: cat.name,
    value: adCounts[cat.slug] || 0,
  })).filter(cat => cat.value > 0).sort((a, b) => b.value - a.value);

  // 2. Fetch user growth data
  const { data: recentUsers, error: recentUsersError } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (recentUsersError) {
    throw new Error(recentUsersError.message);
  }

  const interval = eachDayOfInterval({ start: thirtyDaysAgo, end: new Date() });
  const usersByDay = interval.map(day => ({
    date: format(day, 'dd/MM'),
    count: 0,
  }));

  recentUsers.forEach(user => {
    if (user.created_at) {
      const dateStr = format(parseISO(user.created_at), 'dd/MM');
      const dayData = usersByDay.find(d => d.date === dateStr);
      if (dayData) {
        dayData.count++;
      }
    }
  });

  return { categoryDistribution, usersByDay };
};

const Insights = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["adminInsights"],
    queryFn: fetchInsightsData,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Insights</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Insights</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <CategoryDistributionChart data={data?.categoryDistribution || []} />
        <UserGrowthChart data={data?.usersByDay || []} />
      </div>
    </div>
  );
};

export default Insights;