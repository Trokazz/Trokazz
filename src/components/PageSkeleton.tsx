import { Skeleton } from "./ui/skeleton";

const PageSkeleton = () => (
  <div className="space-y-8">
    <Skeleton className="h-8 w-1/2" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);

export default PageSkeleton;