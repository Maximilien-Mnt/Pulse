import type { SportId } from "@/lib/constants";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PostFormat = "text" | "image" | "gallery" | "video";

export type PublicSportStatus =
  | "Coach"
  | "Amateur"
  | "Récréatif"
  | "Semi-Professionnel"
  | "Professionnel";

export type PublicStatusMap = Record<string, PublicSportStatus>;

export type MessageType = "text" | "image" | "file" | "system";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          birth_date: string | null;
          country: string | null;
          city: string | null;
          language: string;
          height_cm: number | null;
          weight_kg: number | null;
          discovery_source: string | null;
          interested_sports: string[];
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          is_public_profile: boolean;
          public_status: Json;
          public_photos: string[];
          push_token: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          birth_date?: string | null;
          country?: string | null;
          city?: string | null;
          language?: string;
          height_cm?: number | null;
          weight_kg?: number | null;
          discovery_source?: string | null;
          interested_sports?: string[];
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          is_public_profile?: boolean;
          public_status?: Json;
          public_photos?: string[];
          push_token?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      user_sports: {
        Row: {
          id: string;
          user_id: string;
          sport_id: string;
          level: string;
          practice: string;
          weekdays: number[];
          times_per_week: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sport_id: string;
          level: string;
          practice: string;
          weekdays?: number[];
          times_per_week?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_sports"]["Insert"]>;
        Relationships: [];
      };
      user_objectives: {
        Row: {
          id: string;
          user_id: string;
          objective: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          objective: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_objectives"]["Insert"]>;
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["follows"]["Insert"]>;
        Relationships: [];
      };
      clubs: {
        Row: {
          id: string;
          name: string;
          sport: string;
          description: string;
          short_description: string;
          country: string;
          city: string;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          logo_url: string | null;
          hero_urls: string[];
          registration_url: string | null;
          is_external: boolean;
          source_url: string | null;
          source_name: string | null;
          member_count: number;
          founded_date: string | null;
          league: string | null;
          age_min: number | null;
          age_max: number | null;
          required_level: string | null;
          contact_email: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          is_private: boolean;
          training_schedule: Json;
          website_url: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          sport: string;
          description?: string;
          short_description?: string;
          country: string;
          city: string;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          logo_url?: string | null;
          hero_urls?: string[];
          registration_url?: string | null;
          is_external?: boolean;
          source_url?: string | null;
          source_name?: string | null;
          member_count?: number;
          founded_date?: string | null;
          league?: string | null;
          age_min?: number | null;
          age_max?: number | null;
          required_level?: string | null;
          contact_email?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          is_private?: boolean;
          training_schedule?: Json;
          website_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["clubs"]["Insert"]>;
        Relationships: [];
      };
      club_members: {
        Row: {
          club_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          club_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["club_members"]["Insert"]>;
        Relationships: [];
      };
      club_favorites: {
        Row: {
          user_id: string;
          club_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          club_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["club_favorites"]["Insert"]>;
        Relationships: [];
      };
      club_join_requests: {
        Row: {
          id: string;
          club_id: string;
          user_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          user_id: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["club_join_requests"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string;
          sport: string;
          description: string;
          short_description: string;
          country: string;
          city: string;
          venue_address: string | null;
          latitude: number | null;
          longitude: number | null;
          start_date: string;
          end_date: string | null;
          price_cents: number;
          is_paid: boolean;
          difficulty: number;
          category: string | null;
          logo_url: string | null;
          hero_urls: string[];
          registration_url: string | null;
          is_external: boolean;
          source_url: string | null;
          source_name: string | null;
          places_total: number | null;
          places_left: number | null;
          required_level: string | null;
          club_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          is_private: boolean;
          website_url: string | null;
          age_min: number | null;
          age_max: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          sport: string;
          description?: string;
          short_description?: string;
          country: string;
          city: string;
          venue_address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          start_date: string;
          end_date?: string | null;
          price_cents?: number;
          is_paid?: boolean;
          difficulty?: number;
          category?: string | null;
          logo_url?: string | null;
          hero_urls?: string[];
          registration_url?: string | null;
          is_external?: boolean;
          source_url?: string | null;
          source_name?: string | null;
          places_total?: number | null;
          places_left?: number | null;
          required_level?: string | null;
          club_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          is_private?: boolean;
          website_url?: string | null;
          age_min?: number | null;
          age_max?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      event_participants: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_participants"]["Insert"]>;
        Relationships: [];
      };
      event_favorites: {
        Row: {
          user_id: string;
          event_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          event_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_favorites"]["Insert"]>;
        Relationships: [];
      };
      event_join_requests: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_join_requests"]["Insert"]>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          body: string | null;
          format: PostFormat;
          media_urls: string[];
          tags: string[];
          likes_count: number;
          comments_count: number;
          shares_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          body?: string | null;
          format?: PostFormat;
          media_urls?: string[];
          tags?: string[];
          likes_count?: number;
          comments_count?: number;
          shares_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [];
      };
      post_likes: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_likes"]["Insert"]>;
        Relationships: [];
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          body: string;
          likes_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          body: string;
          likes_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_comments"]["Insert"]>;
        Relationships: [];
      };
      comment_likes: {
        Row: {
          comment_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          comment_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comment_likes"]["Insert"]>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          is_group: boolean;
          group_name: string | null;
          group_photo_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          is_group?: boolean;
          group_name?: string | null;
          group_photo_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
        Relationships: [];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          user_id: string;
          pinned: boolean;
          left_at: string | null;
          unread_count: number;
          last_read_at: string | null;
          joined_at: string;
          is_public_list: boolean;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          pinned?: boolean;
          left_at?: string | null;
          unread_count?: number;
          last_read_at?: string | null;
          joined_at?: string;
          is_public_list?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["conversation_participants"]["Insert"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string | null;
          created_at: string;
          deleted_at: string | null;
          is_deleted: boolean;
          is_edited: boolean;
          pinned_until: string | null;
          type: MessageType;
          file_url: string | null;
          file_name: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          is_deleted?: boolean;
          is_edited?: boolean;
          pinned_until?: string | null;
          type?: MessageType;
          file_url?: string | null;
          file_name?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [];
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_reactions"]["Insert"]>;
        Relationships: [];
      };
      message_hidden: {
        Row: {
          message_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_hidden"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          message: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string | null;
          body: string | null;
          data: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title?: string | null;
          body?: string | null;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      user_stats: {
        Row: {
          user_id: string;
          followers_count: number;
          following_count: number;
          posts_count: number;
          updated_at: string;
          total_likes_received: number;
          total_comments_received: number;
          clubs_created_count: number;
          events_created_count: number;
          historical_follows_count: number;
          unfollows_count: number;
        };
        Insert: {
          user_id: string;
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
          updated_at?: string;
          total_likes_received?: number;
          total_comments_received?: number;
          clubs_created_count?: number;
          events_created_count?: number;
          historical_follows_count?: number;
          unfollows_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["user_stats"]["Insert"]>;
        Relationships: [];
      };
      feed_interactions: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          action: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          action: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_interactions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      feed_scored_posts: {
        Row: Post & { base_score: number };
        Relationships: [];
      };
    };
    Functions: {
      check_username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
      get_scored_feed: {
        Args: {
          p_user_id: string;
          p_limit?: number;
          p_offset?: number;
          p_tag?: string | null;
        };
        Returns: (Post & { score: number })[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Profile = Tables<"profiles">;
export type Post = Tables<"posts">;
export type Club = Tables<"clubs">;
export type EventRow = Tables<"events">;
export type Conversation = Tables<"conversations">;
export type Message = Tables<"messages">;
export type PostComment = Tables<"post_comments">;
export type UserStats = Tables<"user_stats">;
export type UserSport = Tables<"user_sports">;

export type PublicProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "username"
  | "avatar_url"
  | "bio"
  | "country"
  | "city"
  | "is_public_profile"
  | "public_status"
  | "public_photos"
>;

export type FeedPost = Post & {
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;
  liked_by_me?: boolean;
  video_url?: string | null;
  video_thumbnail?: string | null;
  video_duration?: number | null;
};

export type SignupSportSelection = {
  sportId: SportId;
  level: string;
  practice: string;
  weekdays: number[];
  timesPerWeek: number;
};

export type ConversationListItemDownload = {
  type: "message";
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  is_deleted: boolean;
}[];

export type TagSuggestion = { tag: string; count: number };

export type ProfileUpdate = {
  full_name?: string;
  bio?: string | null;
  city?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  avatar_url?: string | null;
  language?: string;
};
