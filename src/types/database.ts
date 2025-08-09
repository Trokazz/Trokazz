// Tipos baseados nas tabelas do Supabase

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_verified?: boolean;
  role?: 'user' | 'admin';
  // Adicione outros campos do perfil conforme necessário
};

export type Advertisement = {
  id: string;
  title: string;
  price: number;
  image_urls: string[];
  created_at: string;
  boosted_until?: string | null;
  // Adicione outros campos do anúncio conforme necessário
};

// Tipos complexos para queries com joins

export type ConversationWithDetails = {
  id: string;
  last_message_at: string;
  advertisements: {
    title: string | null;
    image_urls: string[] | null;
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
  reportsAgainstUser: any[]; // Manter como 'any' por enquanto devido à complexidade
  offers: OfferWithDetails[];
  conversations: ConversationWithDetails[];
  favorites: any[]; // Manter como 'any' por enquanto
  violations: any[]; // Manter como 'any' por enquanto
};