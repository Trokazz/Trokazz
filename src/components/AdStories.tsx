import { Link } from "react-router-dom";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { getOptimizedImageUrl } from "@/lib/utils";

type AdStory = {
  id: string;
  title: string;
  image_urls: string[];
  category_name: string;
  category_slug: string;
};

interface AdStoriesProps {
  stories: AdStory[] | null | undefined;
  isLoading: boolean;
}

const AdStories = ({ stories, isLoading }: AdStoriesProps) => {
  if (isLoading) {
    return (
      <div className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-4 pb-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-20">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  if (!stories || stories.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Destaques por Categoria</h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-4 pb-4">
          {stories.map((story) => (
            <Link
              key={story.id}
              to={`/anuncio/${story.id}`}
              className="group flex flex-col items-center gap-2 w-20 text-center"
            >
              <div className="h-20 w-20 rounded-full p-1 bg-gradient-to-tr from-primary to-accent-gradient transition-transform duration-300 group-hover:scale-105">
                <div className="h-full w-full bg-background rounded-full p-1">
                  <img
                    src={getOptimizedImageUrl(story.image_urls[0], { width: 150, height: 150, resize: 'cover' }) || '/placeholder.svg'}
                    alt={story.title}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground truncate w-full group-hover:text-primary transition-colors">
                {story.category_name}
              </p>
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default AdStories;