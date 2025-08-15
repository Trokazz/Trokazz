// Tipos baseados nas tabelas do Supabase

export type Profile = {
  id: string;
  created_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: 'user' | 'admin' | null;
  username: string | null;
  is_verified: boolean | null;
  store_type: string | null;
  store_banner_url: string | null;
  address: string | null;
  operating_hours: string | null;
  is_open: boolean | null;
  status: 'active' | 'suspended';
  service_tags: string[] | null;
  badges?: ReputationBadgeType[];
  account_type: 'fisica' | 'juridica' | null;
  document_number: string | null;
  date_of_birth: string | null;
  email: string | null;
};

export type Advertisement = {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  price: number;
  image_urls: string[];
  user_id: string;
  category_slug: string | null;
  status: 'pending_approval' | 'approved' | 'rejected' | 'sold' | 'paused';
  view_count: number;
  boosted_until: string | null;
  last_renewed_at: string | null;
  metadata: any | null;
  latitude: number | null;
  longitude: number | null;
  flag_reason: string | null;
  profiles?: { full_name: string | null };
  expires_at?: string | null; // Adicionado para o tipo Advertisement
};

export type ReputationBadgeType = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export type ConversationWithDetails = {
  id: string;
  last_message_at: string;
  conversation_type: 'ad_chat' | 'wanted_ad_chat';
  advertisements: {
    id: string; // Adicionado ID
    title: string | null;
    image_urls: string[] | null;
  } | null;
  wanted_ads: { // Adicionado ID
    id: string;
    title: string | null;
  } | null;
  buyer: Profile | null;
  seller: Profile | null;
  messages: {
    content: string;
    created_at: string;
    is_read: boolean;
    sender_id: string;
  }[];
};

export type OfferWithDetails = {
  id: string;
  offer_amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  advertisements: {
    id: string;
    title: string | null;
    image_urls: string[] | null;
  } | null;
  buyer: Profile | null;
  seller: Profile | null;
};

export type ReviewWithReviewer = {
    id: string;
    seller_id: string;
    reviewer_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    reviewer: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
};

export type UserDetailsData = {
  profile: Profile;
  ads: Advertisement[];
  reportsAgainstUser: any[];
  offers: OfferWithDetails[];
  conversations: ConversationWithDetails[];
  favorites: any[];
  violations: any[];
};

export type ProfilePageData = {
  profile: Profile | null; // Alterado para permitir null
  ads: (Advertisement & { view_count: number; last_renewed_at: string | null; boosted_until: string | null })[];
  reviews: ReviewWithReviewer[];
  credits: { balance: number } | null;
  settings: { boost_price?: string; boost_duration_days?: string; } | null;
};