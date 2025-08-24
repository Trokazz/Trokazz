import { Database } from './supabase';

// Tipos baseados nas tabelas do Supabase

export type UserLevelDetails = Database['public']['Tables']['user_levels']['Row'];

export type Profile = Database['public']['Tables']['profiles']['Row'] & {
  badges?: ReputationBadgeType[];
  userLevelDetails?: UserLevelDetails | null; // NOVO: Detalhes do nível do usuário
  // Flattened fields from user_levels (temporariamente adicionado para RPC processing)
  userLevelDetails_level_name?: string | null;
  userLevelDetails_description?: string | null;
  userLevelDetails_badge_icon?: string | null;
  userLevelDetails_boost_discount_percentage?: number | null;
  userLevelDetails_min_transactions?: number | null;
  userLevelDetails_min_avg_rating?: number | null;
  userLevelDetails_priority?: number | null;
};

export type Advertisement = Database['public']['Tables']['advertisements']['Row'] & {
  profiles?: { // Detalhes do perfil do vendedor
    id: string;
    full_name: string | null;
    username: string | null;
    is_verified: boolean | null;
    user_level: string | null;
    userLevelDetails: UserLevelDetails | null;
  };
};

export type ReputationBadgeType = Database['public']['Tables']['badges']['Row'];

export type ConversationWithDetails = Database['public']['Tables']['conversations']['Row'] & {
  advertisements: Pick<Database['public']['Tables']['advertisements']['Row'], 'id' | 'title' | 'image_urls'> | null;
  wanted_ads: Pick<Database['public']['Tables']['wanted_ads']['Row'], 'id' | 'title'> | null;
  buyer: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null;
  seller: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null;
  messages: Pick<Database['public']['Tables']['messages']['Row'], 'content' | 'created_at' | 'is_read' | 'sender_id'>[];
};

export type OfferWithDetails = Database['public']['Tables']['offers']['Row'] & {
  advertisements: Pick<Database['public']['Tables']['advertisements']['Row'], 'id' | 'title' | 'image_urls'> | null;
  buyer: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null;
  seller: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null;
};

export type ReviewWithReviewer = Database['public']['Tables']['reviews']['Row'] & {
    reviewer: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null;
};

export type UserDetailsData = {
  profile: Profile;
  ads: Advertisement[];
  reportsAgainstUser: (Database['public']['Tables']['reports']['Row'] & {
    advertisements: Pick<Database['public']['Tables']['advertisements']['Row'], 'title'> | null;
    reporter: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name'> | null;
  })[];
  offers: OfferWithDetails[];
  conversations: ConversationWithDetails[];
  favorites: (Database['public']['Tables']['favorites']['Row'] & {
    advertisements: Pick<Database['public']['Tables']['advertisements']['Row'], 'title' | 'price'> | null;
  })[];
  violations: (Database['public']['Tables']['violations']['Row'] & {
    admin: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name'> | null;
  })[];
  credits: Pick<Database['public']['Tables']['user_credits']['Row'], 'balance'> | null;
  creditTransactions: (Database['public']['Tables']['credit_transactions']['Row'] & {
    advertisements: Pick<Database['public']['Tables']['advertisements']['Row'], 'title'> | null;
  })[];
};

export type ProfilePageData = {
  profile: Profile | null;
  ads: (Advertisement & { view_count: number; last_renewed_at: string | null; boosted_until: string | null })[];
  reviews: ReviewWithReviewer[];
  credits: Pick<Database['public']['Tables']['user_credits']['Row'], 'balance'> | null;
  settings: { boost_price?: string; boost_duration_days?: string; } | null;
  creditTransactions: (Database['public']['Tables']['credit_transactions']['Row'] & {
    advertisements: Pick<Database['public']['Tables']['advertisements']['Row'], 'title'> | null;
  })[];
};

// Novos tipos para a página inicial
export type Banner = Database['public']['Tables']['banners']['Row'];

export type AdStory = Pick<Database['public']['Tables']['advertisements']['Row'], 'id' | 'title' | 'image_urls'> & {
  category_name: string;
  category_slug: string;
};

export type Activity = Database['public']['Tables']['activity_feed']['Row'];

// Atualizado: Adicionado image_url à Category
export type Category = Database['public']['Tables']['categories']['Row'] & { image_url: string | null; };

export type HomePageData = {
  banners: Banner[];
  stories: AdStory[];
  ads: Advertisement[];
  activity_feed: Activity[];
};