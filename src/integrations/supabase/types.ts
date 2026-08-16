export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      business_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_subcategories: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_subcategories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "business_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          channel: Database["public"]["Enums"]["interaction_type"];
          created_at: string;
          description: string | null;
          ends_at: string | null;
          id: string;
          name: string;
          starts_at: string | null;
          status: Database["public"]["Enums"]["campaign_status"];
          template_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          channel?: Database["public"]["Enums"]["interaction_type"];
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          name: string;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          template_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          channel?: Database["public"]["Enums"]["interaction_type"];
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          name?: string;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          template_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "message_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      digital_audits: {
        Row: {
          audit_summary: string | null;
          conversion_opportunity: number;
          conversion_problems: Json;
          created_at: string;
          digital_presence_score: number;
          evidence: Json;
          id: string;
          landing_page_opportunity: number;
          lead_id: string;
          recommended_sections: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          audit_summary?: string | null;
          conversion_opportunity?: number;
          conversion_problems?: Json;
          created_at?: string;
          digital_presence_score?: number;
          evidence?: Json;
          id?: string;
          landing_page_opportunity?: number;
          lead_id: string;
          recommended_sections?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          audit_summary?: string | null;
          conversion_opportunity?: number;
          conversion_problems?: Json;
          created_at?: string;
          digital_presence_score?: number;
          evidence?: Json;
          id?: string;
          landing_page_opportunity?: number;
          lead_id?: string;
          recommended_sections?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "digital_audits_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_ai_analyses: {
        Row: {
          confidence: number | null;
          created_at: string;
          id: string;
          lead_id: string;
          model: string;
          opportunities: Json;
          pain_points: Json;
          provider: string;
          purchase_potential: number | null;
          reasoning: string | null;
          recommended_approach: string | null;
          recommended_offer: string | null;
          suggested_message: string | null;
          summary: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          confidence?: number | null;
          created_at?: string;
          id?: string;
          lead_id: string;
          model: string;
          opportunities?: Json;
          pain_points?: Json;
          provider: string;
          purchase_potential?: number | null;
          reasoning?: string | null;
          recommended_approach?: string | null;
          recommended_offer?: string | null;
          suggested_message?: string | null;
          summary?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          confidence?: number | null;
          created_at?: string;
          id?: string;
          lead_id?: string;
          model?: string;
          opportunities?: Json;
          pain_points?: Json;
          provider?: string;
          purchase_potential?: number | null;
          reasoning?: string | null;
          recommended_approach?: string | null;
          recommended_offer?: string | null;
          suggested_message?: string | null;
          summary?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_ai_analyses_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_interactions: {
        Row: {
          campaign_id: string | null;
          content: string | null;
          created_at: string;
          id: string;
          lead_id: string;
          occurred_at: string;
          subject: string | null;
          type: Database["public"]["Enums"]["interaction_type"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          campaign_id?: string | null;
          content?: string | null;
          created_at?: string;
          id?: string;
          lead_id: string;
          occurred_at?: string;
          subject?: string | null;
          type?: Database["public"]["Enums"]["interaction_type"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          campaign_id?: string | null;
          content?: string | null;
          created_at?: string;
          id?: string;
          lead_id?: string;
          occurred_at?: string;
          subject?: string | null;
          type?: Database["public"]["Enums"]["interaction_type"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_interactions_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_interactions_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_scores: {
        Row: {
          audience_score: number;
          classification: Database["public"]["Enums"]["lead_classification"];
          commercial_potential_score: number;
          conversion_opportunity_score: number;
          created_at: string;
          digital_presence_score: number;
          id: string;
          lead_id: string;
          reputation_score: number;
          total_score: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          audience_score?: number;
          classification?: Database["public"]["Enums"]["lead_classification"];
          commercial_potential_score?: number;
          conversion_opportunity_score?: number;
          created_at?: string;
          digital_presence_score?: number;
          id?: string;
          lead_id: string;
          reputation_score?: number;
          total_score?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          audience_score?: number;
          classification?: Database["public"]["Enums"]["lead_classification"];
          commercial_potential_score?: number;
          conversion_opportunity_score?: number;
          created_at?: string;
          digital_presence_score?: number;
          id?: string;
          lead_id?: string;
          reputation_score?: number;
          total_score?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_scores_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: true;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_social_profiles: {
        Row: {
          activity_level: Database["public"]["Enums"]["social_activity"];
          created_at: string;
          followers: number | null;
          id: string;
          last_post_at: string | null;
          lead_id: string;
          network: Database["public"]["Enums"]["social_network"];
          post_count: number | null;
          profile_url: string | null;
          updated_at: string;
          user_id: string;
          username: string | null;
        };
        Insert: {
          activity_level?: Database["public"]["Enums"]["social_activity"];
          created_at?: string;
          followers?: number | null;
          id?: string;
          last_post_at?: string | null;
          lead_id: string;
          network: Database["public"]["Enums"]["social_network"];
          post_count?: number | null;
          profile_url?: string | null;
          updated_at?: string;
          user_id: string;
          username?: string | null;
        };
        Update: {
          activity_level?: Database["public"]["Enums"]["social_activity"];
          created_at?: string;
          followers?: number | null;
          id?: string;
          last_post_at?: string | null;
          lead_id?: string;
          network?: Database["public"]["Enums"]["social_network"];
          post_count?: number | null;
          profile_url?: string | null;
          updated_at?: string;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lead_social_profiles_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          address: string | null;
          average_ticket_range: string | null;
          business_category: string | null;
          business_model: Database["public"]["Enums"]["business_model"] | null;
          business_subcategory: string | null;
          city: string | null;
          company_name: string;
          country: string | null;
          created_at: string;
          description: string | null;
          email: string | null;
          google_place_id: string | null;
          google_rating: number | null;
          google_review_count: number | null;
          has_website: boolean;
          has_whatsapp: boolean;
          id: string;
          instagram_followers: number | null;
          instagram_last_post_at: string | null;
          instagram_post_count: number | null;
          instagram_url: string | null;
          instagram_username: string | null;
          latitude: number | null;
          longitude: number | null;
          phone: string | null;
          sales_model: string | null;
          source: string;
          state: string | null;
          status: Database["public"]["Enums"]["lead_status"];
          updated_at: string;
          user_id: string;
          website_quality: Database["public"]["Enums"]["website_quality"];
          website_url: string | null;
        };
        Insert: {
          address?: string | null;
          average_ticket_range?: string | null;
          business_category?: string | null;
          business_model?: Database["public"]["Enums"]["business_model"] | null;
          business_subcategory?: string | null;
          city?: string | null;
          company_name: string;
          country?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          google_place_id?: string | null;
          google_rating?: number | null;
          google_review_count?: number | null;
          has_website?: boolean;
          has_whatsapp?: boolean;
          id?: string;
          instagram_followers?: number | null;
          instagram_last_post_at?: string | null;
          instagram_post_count?: number | null;
          instagram_url?: string | null;
          instagram_username?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          sales_model?: string | null;
          source?: string;
          state?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
          user_id: string;
          website_quality?: Database["public"]["Enums"]["website_quality"];
          website_url?: string | null;
        };
        Update: {
          address?: string | null;
          average_ticket_range?: string | null;
          business_category?: string | null;
          business_model?: Database["public"]["Enums"]["business_model"] | null;
          business_subcategory?: string | null;
          city?: string | null;
          company_name?: string;
          country?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          google_place_id?: string | null;
          google_rating?: number | null;
          google_review_count?: number | null;
          has_website?: boolean;
          has_whatsapp?: boolean;
          id?: string;
          instagram_followers?: number | null;
          instagram_last_post_at?: string | null;
          instagram_post_count?: number | null;
          instagram_url?: string | null;
          instagram_username?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          sales_model?: string | null;
          source?: string;
          state?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
          user_id?: string;
          website_quality?: Database["public"]["Enums"]["website_quality"];
          website_url?: string | null;
        };
        Relationships: [];
      };
      message_templates: {
        Row: {
          body: string;
          channel: Database["public"]["Enums"]["interaction_type"];
          created_at: string;
          id: string;
          name: string;
          subject: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          channel?: Database["public"]["Enums"]["interaction_type"];
          created_at?: string;
          id?: string;
          name: string;
          subject?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          channel?: Database["public"]["Enums"]["interaction_type"];
          created_at?: string;
          id?: string;
          name?: string;
          subject?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      opportunities: {
        Row: {
          created_at: string;
          evidence: Json;
          id: string;
          lead_id: string;
          reason: string | null;
          recommended_solution: string | null;
          score: number;
          type: Database["public"]["Enums"]["opportunity_type"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          evidence?: Json;
          id?: string;
          lead_id: string;
          reason?: string | null;
          recommended_solution?: string | null;
          score?: number;
          type: Database["public"]["Enums"]["opportunity_type"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          evidence?: Json;
          id?: string;
          lead_id?: string;
          reason?: string | null;
          recommended_solution?: string | null;
          score?: number;
          type?: Database["public"]["Enums"]["opportunity_type"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opportunities_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prospection_results: {
        Row: {
          created_at: string;
          google_place_id: string | null;
          id: string;
          imported: boolean;
          lead_id: string | null;
          prospection_id: string;
          raw_payload: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          google_place_id?: string | null;
          id?: string;
          imported?: boolean;
          lead_id?: string | null;
          prospection_id: string;
          raw_payload?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          google_place_id?: string | null;
          id?: string;
          imported?: boolean;
          lead_id?: string | null;
          prospection_id?: string;
          raw_payload?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prospection_results_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prospection_results_prospection_id_fkey";
            columns: ["prospection_id"];
            isOneToOne: false;
            referencedRelation: "prospections";
            referencedColumns: ["id"];
          },
        ];
      };
      prospections: {
        Row: {
          category: string | null;
          city: string | null;
          created_at: string;
          id: string;
          name: string;
          radius: number | null;
          requested_limit: number;
          state: string | null;
          status: Database["public"]["Enums"]["prospection_status"];
          subcategory: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          city?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          radius?: number | null;
          requested_limit?: number;
          state?: string | null;
          status?: Database["public"]["Enums"]["prospection_status"];
          subcategory?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string | null;
          city?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          radius?: number | null;
          requested_limit?: number;
          state?: string | null;
          status?: Database["public"]["Enums"]["prospection_status"];
          subcategory?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          created_at: string;
          description: string | null;
          due_at: string | null;
          id: string;
          lead_id: string | null;
          priority: Database["public"]["Enums"]["task_priority"];
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          lead_id?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          lead_id?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      business_model:
        | "PRODUCT"
        | "SERVICE"
        | "PRODUCT_AND_SERVICE"
        | "SUBSCRIPTION"
        | "APPOINTMENT"
        | "DELIVERY"
        | "QUOTE"
        | "ONLINE_SALE"
        | "LOCAL_SALE"
        | "LEAD_GENERATION";
      campaign_status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
      interaction_type:
        "NOTE" | "CALL" | "WHATSAPP" | "EMAIL" | "MEETING" | "INSTAGRAM" | "VISIT" | "OTHER";
      lead_classification: "COLD" | "WARM" | "HOT" | "PRIORITY" | "UNKNOWN";
      lead_status:
        | "NEW"
        | "QUALIFIED"
        | "CONTACT_READY"
        | "CONTACTED"
        | "RESPONDED"
        | "MEETING"
        | "PROPOSAL"
        | "NEGOTIATION"
        | "WON"
        | "LOST"
        | "NO_INTEREST"
        | "NO_RESPONSE";
      opportunity_type:
        | "NO_WEBSITE"
        | "WEAK_WEBSITE"
        | "CONVERSION"
        | "CATALOG"
        | "LEAD_GENERATION"
        | "APPOINTMENT"
        | "QUOTE"
        | "DIGITAL_PRESENCE";
      prospection_status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
      social_activity: "VERY_ACTIVE" | "ACTIVE" | "MODERATE" | "INACTIVE" | "UNKNOWN";
      social_network: "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "TIKTOK" | "YOUTUBE" | "X" | "OTHER";
      task_priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      task_status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
      website_quality: "NO_WEBSITE" | "WEAK" | "AVERAGE" | "GOOD" | "EXCELLENT" | "UNKNOWN";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      business_model: [
        "PRODUCT",
        "SERVICE",
        "PRODUCT_AND_SERVICE",
        "SUBSCRIPTION",
        "APPOINTMENT",
        "DELIVERY",
        "QUOTE",
        "ONLINE_SALE",
        "LOCAL_SALE",
        "LEAD_GENERATION",
      ],
      campaign_status: ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"],
      interaction_type: [
        "NOTE",
        "CALL",
        "WHATSAPP",
        "EMAIL",
        "MEETING",
        "INSTAGRAM",
        "VISIT",
        "OTHER",
      ],
      lead_classification: ["COLD", "WARM", "HOT", "PRIORITY", "UNKNOWN"],
      lead_status: [
        "NEW",
        "QUALIFIED",
        "CONTACT_READY",
        "CONTACTED",
        "RESPONDED",
        "MEETING",
        "PROPOSAL",
        "NEGOTIATION",
        "WON",
        "LOST",
        "NO_INTEREST",
        "NO_RESPONSE",
      ],
      opportunity_type: [
        "NO_WEBSITE",
        "WEAK_WEBSITE",
        "CONVERSION",
        "CATALOG",
        "LEAD_GENERATION",
        "APPOINTMENT",
        "QUOTE",
        "DIGITAL_PRESENCE",
      ],
      prospection_status: ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"],
      social_activity: ["VERY_ACTIVE", "ACTIVE", "MODERATE", "INACTIVE", "UNKNOWN"],
      social_network: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TIKTOK", "YOUTUBE", "X", "OTHER"],
      task_priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      task_status: ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"],
      website_quality: ["NO_WEBSITE", "WEAK", "AVERAGE", "GOOD", "EXCELLENT", "UNKNOWN"],
    },
  },
} as const;
