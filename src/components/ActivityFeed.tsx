import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { safeFormatDistanceToNow } from "@/lib/utils";

const fetchActivityFeed = async () => {
  const { data, error } = await supabase
    .from("activity_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15);
  if (error) throw error;
  return data;
};

const ActivityFeed = () => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activityFeed"],
    queryFn: fetchActivityFeed,
    refetchInterval: 60000, // Atualiza a cada minuto
  });

  const renderIcon = (iconName: string | null) => {
    if (!iconName) return <Icons.Zap className="h-5 w-5 text-muted-foreground" />;
    const Icon = (Icons as any)[iconName] || Icons.Zap;
    return <Icon className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade da Comunidade</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
          {activities?.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <div className="mt-1">{renderIcon(activity.icon)}</div>
              <div className="flex-1">
                <p className="text-sm">
                  {activity.link ? (
                    <Link to={activity.link} className="hover:underline">{activity.message}</Link>
                  ) : (
                    activity.message
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {safeFormatDistanceToNow(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;