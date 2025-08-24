export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_feed: {
        Row: {
          created_at: string | null
          icon: string | null
          id: number
          link: string | null
          message: string
          type: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: number
          link?: string | null
          message: string
          type: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: number
          link?: string | null
          message?: string
          type?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          type?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          boosted_until: string | null
          category: string | null
          category_slug: string | null
          contact_info: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          flag_reason: string | null
          id: string
          image_urls: string[]
          last_renewed_at: string | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          price: number
          status: string
          subcategory_slug: string | null
          title: string
          user_id: string | null
          view_count: number
        }
        Insert: {
          boosted_until?: string | null
          category?: string | null
          category_slug?: string | null
          contact_info?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          flag_reason?: string | null
          id?: string
          image_urls: string[]
          last_renewed_at?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          price: number
          status?: string
          subcategory_slug?: string | null
          title: string
          user_id?: string | null
          view_count?: number
        }
        Update: {
          boosted_until?: string | null
          category?: string | null
          category_slug?: string | null
          contact_info?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          flag_reason?: string | null
          id?: string
          image_urls?: string[]
          last_renewed_at?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          price?: number
          status?: string
          subcategory_slug?: string | null
          title?: string
          user_id?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          description: string
          icon: string
          id: string
          name: string
        }
        Update: {
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          background_color: string | null
          button_text: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          starts_at: string | null
          text_color: string | null
          title: string
        }
        Insert: {
          background_color?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          starts_at?: string | null
          text_color?: string | null
          title: string
        }
        Update: {
          background_color?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          starts_at?: string | null
          text_color?: string | null
          title?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          connected_service_tags: string[] | null
          custom_fields: Json | null
          id: string
          icon: string | null
          name: string
          parent_slug: string | null
          slug: string
        }
        Insert: {
          connected_service_tags?: string[] | null
          custom_fields?: Json | null
          id?: string
          icon?: string | null
          name: string
          parent_slug?: string | null
          slug: string
        }
        Update: {
          connected_service_tags?: string[] | null
          custom_fields?: Json | null
          id?: string
          icon?: string | null
          name?: string
          parent_slug?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_slug_fkey"
            columns: ["parent_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      conversations: {
        Row: {
          ad_id: string | null
          buyer_id: string
          conversation_type: string
          created_at: string | null
          id: string
          last_message_at: string | null
          seller_id: string
          wanted_ad_id: string | null
        }
        Insert: {
          ad_id?: string | null
          buyer_id: string
          conversation_type?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          seller_id: string
          wanted_ad_id?: string | null
        }
        Update: {
          ad_id?: string | null
          buyer_id?: string
          conversation_type?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          seller_id?: string
          wanted_ad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_wanted_ad_id_fkey"
            columns: ["wanted_ad_id"]
            isOneToOne: false
            referencedRelation: "wanted_ads"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          price_in_cents: number
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          price_in_cents: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          price_in_cents?: number
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: number
          related_ad_id: string | null
          stripe_payment_intent_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: number
          related_ad_id?: string | null
          stripe_payment_intent_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: number
          related_ad_id?: string | null
          stripe_payment_intent_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_related_ad_id_fkey"
            columns: ["related_ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          age_rating: string | null
          category: string
          created_at: string | null
          date: string
          description: string
          id: string
          image: string
          is_free: boolean
          isHighlight: boolean | null
          isTodaysEvent: boolean | null
          isWeekendHighlight: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          status: string
          submitter_email: string | null
          submitter_name: string | null
          ticket_url: string | null
          time: string
          videoUrl: string | null
          view_count: number | null
        }
        Insert: {
          age_rating?: string | null
          category: string
          created_at?: string | null
          date: string
          description: string
          id?: string
          image: string
          is_free?: boolean
          isHighlight?: boolean | null
          isTodaysEvent?: boolean | null
          isWeekendHighlight?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          status?: string
          submitter_email?: string | null
          submitter_name?: string | null
          ticket_url?: string | null
          time: string
          videoUrl?: string | null
          view_count?: number | null
        }
        Update: {
          age_rating?: string | null
          category?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          image?: string
          is_free?: boolean
          isHighlight?: boolean | null
          isTodaysEvent?: boolean | null
          isWeekendHighlight?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          status?: string
          submitter_email?: string | null
          submitter_name?: string | null
          ticket_url?: string | null
          time?: string
          videoUrl?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          ad_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price: number
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          published_at: string | null
          source_name: string | null
          status: string
          title: string
          url: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          source_name?: string | null
          status?: string
          title: string
          url: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          source_name?: string | null
          status?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          ad_id: string
          buyer_id: string
          created_at: string | null
          id: string
          offer_amount: number
          seller_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          ad_id: string
          buyer_id: string
          created_at?: string | null
          id?: string
          offer_amount: number
          seller_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          ad_id?: string
          buyer_id?: string
          created_at?: string | null
          id?: string
          offer_amount?: number
          seller_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          type: string
          value: number
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          type: string
          value: number
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          address: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          document_number: string | null
          email: string | null
          full_name: string | null
          id: string
          is_open: boolean | null
          is_verified: boolean | null
          operating_hours: string | null
          phone: string | null
          reputation_score: number | null
          role: string | null
          service_tags: string[] | null
          status: string
          store_banner_url: string | null
          store_type: string | null
          user_level: string | null
          username: string | null
        }
        Insert: {
          account_type?: string | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          document_number?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_open?: boolean | null
          is_verified?: boolean | null
          operating_hours?: string | null
          phone?: string | null
          reputation_score?: number | null
          role?: string | null
          service_tags?: string[] | null
          status?: string
          store_banner_url?: string | null
          store_type?: string | null
          user_level?: string | null
          username?: string | null
        }
        Update: {
          account_type?: string | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          document_number?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_open?: boolean | null
          is_verified?: boolean | null
          operating_hours?: string | null
          phone?: string | null
          reputation_score?: number | null
          role?: string | null
          service_tags?: string[] | null
          status?: string
          store_banner_url?: string | null
          store_type?: string | null
          user_level?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          ad_id: string
          created_at: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          ad_id: string
          created_at?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          ad_id?: string
          created_at?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          communication_rating: number | null
          created_at: string | null
          id: string
          item_quality_rating: number | null
          punctuality_rating: number | null
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          comment?: string | null
          communication_rating?: number | null
          created_at?: string | null
          id?: string
          item_quality_rating?: number | null
          punctuality_rating?: number | null
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Update: {
          comment?: string | null
          communication_rating?: number | null
          created_at?: string | null
          id?: string
          item_quality_rating?: number | null
          punctuality_rating?: number | null
          rating?: number
          reviewer_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_queries: {
        Row: {
          created_at: string
          id: number
          query_text: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          query_text: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          query_text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_slug: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          price: number | null
          pricing_type: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          category_slug: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          pricing_type: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          category_slug?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          pricing_type?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          description: string | null
          key: string
          value: string | null
        }
        Insert: {
          description?: string | null
          key: string
          value?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          last_admin_reply_at: string | null
          last_user_reply_at: string | null
          message: string
          status: string
          subject: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_admin_reply_at?: string | null
          last_user_reply_at?: string | null
          message: string
          status?: string
          subject: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_admin_reply_at?: string | null
          last_user_reply_at?: string | null
          message?: string
          status?: string
          subject?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          context: Json | null
          function_name: string | null
          id: string
          level: string
          message: string
          timestamp: string | null
        }
        Insert: {
          context?: Json | null
          function_name?: string | null
          id?: string
          level: string
          message: string
          timestamp?: string | null
        }
        Update: {
          context?: Json | null
          function_name?: string | null
          id?: string
          level?: string
          message?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_admin_message: boolean | null
          sender_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_admin_message?: boolean | null
          sender_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_admin_message?: boolean | null
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string | null
          badge_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          badge_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          badge_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          balance: number
          user_id: string
        }
        Insert: {
          balance?: number
          user_id: string
        }
        Update: {
          balance?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_levels: {
        Row: {
          badge_icon: string | null
          boost_discount_percentage: number | null
          description: string | null
          level_name: string
          min_avg_rating: number
          min_transactions: number
          priority: number
        }
        Insert: {
          badge_icon?: string | null
          boost_discount_percentage?: number | null
          description?: string | null
          level_name: string
          min_avg_rating: number
          min_transactions: number
          priority: number
        }
        Update: {
          badge_icon?: string | null
          boost_discount_percentage?: number | null
          description?: string | null
          level_name?: string
          min_avg_rating?: number
          min_transactions?: number
          priority?: number
        }
        Relationships: []
      }
      user_promo_code_uses: {
        Row: {
          id: string
          promo_code_id: string
          user_id: string
          used_at: string | null
        }
        Insert: {
          id?: string
          promo_code_id: string
          user_id: string
          used_at?: string | null
        }
        Update: {
          id?: string
          promo_code_id?: string
          user_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_promo_code_uses_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_promo_code_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          created_at: string | null
          document_urls: Json | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_urls?: Json | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_urls?: Json | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      violations: {
        Row: {
          admin_id: string
          created_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wanted_ads: {
        Row: {
          budget: number | null
          category_slug: string | null
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          category_slug?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          budget?: number | null
          category_slug?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wanted_ads_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "wanted_ads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits_by_admin: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_description: string
          p_user_id: string
        }
        Returns: string
      }
      apply_promo_code: {
        Args: {
          p_code: string
          p_user_id: string
        }
        Returns: Json
      }
      check_and_award_badges: {
        Args: {
          user_id_to_check: string
        }
        Returns: undefined
      }
      create_new_message_notification: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_new_ticket_message_notification: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_offer_notification: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_offer_update_notification: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_credit_sales_analytics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_home_activity_feed: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_home_ads: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_home_banners: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_home_page_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_home_stories: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_investor_dashboard_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_profile_page_data: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      get_search_term_analytics: {
        Args: Record<PropertyKey, never>
        Returns: {
          search_count: number
          term: string
        }[]
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      increment_ad_view_count: {
        Args: {
          ad_id_param: string
        }
        Returns: undefined
      }
      increment_view_count: {
        Args: {
          event_id_param: string
        }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_item_sold_to_feed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      log_new_ad_to_feed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      log_new_badge_to_feed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      log_new_user_to_feed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      moderate_ad_content_before: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      move_files_to_root: {
        Args: {
          bucket_name: string
          folder_name: string
        }
        Returns: undefined
      }
      purchase_credits: {
        Args: {
          package_amount: number
          p_stripe_payment_intent_id: string
          p_user_id: string
          p_promo_code?: string
        }
        Returns: string
      }
      resolve_report_and_penalize_user: {
        Args: {
          p_admin_id: string
          p_report_id: string
        }
        Returns: string
      }
      spend_credits_for_boost: {
        Args: {
          ad_id_param: string
        }
        Returns: string
      }
      trigger_check_badges_on_offer: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      trigger_check_badges_on_verify: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_conversation_timestamp: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never