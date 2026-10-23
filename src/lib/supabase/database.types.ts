export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_by: string | null
          description: string | null
          id: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_by?: string | null
          description?: string | null
          id?: never
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_by?: string | null
          description?: string | null
          id?: never
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          edited_at: string | null
          hidden_at: string | null
          hidden_by: string | null
          id: number
          search: unknown
          thread_id: number
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          edited_at?: string | null
          hidden_at?: string | null
          hidden_by?: string | null
          id?: never
          search?: never
          thread_id: number
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          edited_at?: string | null
          hidden_at?: string | null
          hidden_by?: string | null
          id?: never
          search?: never
          thread_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_applications: {
        Row: {
          created_at: string
          id: number
          motivation: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          motivation: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          motivation?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderator_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderator_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affiliation: Database["public"]["Enums"]["affiliation"] | null
          created_at: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          affiliation?: Database["public"]["Enums"]["affiliation"] | null
          created_at?: string
          display_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          affiliation?: Database["public"]["Enums"]["affiliation"] | null
          created_at?: string
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      thread_revisions: {
        Row: {
          body: string
          created_at: string
          edited_by: string | null
          id: number
          thread_id: number
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          edited_by?: string | null
          id?: never
          thread_id: number
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          edited_by?: string | null
          id?: never
          thread_id?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_revisions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_revisions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          author_id: string | null
          best_comment_id: number | null
          body: string
          category_id: number
          city: Database["public"]["Enums"]["city"] | null
          created_at: string
          edited_at: string | null
          id: number
          is_outdated: boolean
          is_pinned: boolean
          last_activity_at: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search: unknown
          slug: string
          status: Database["public"]["Enums"]["thread_status"]
          title: string
        }
        Insert: {
          author_id?: string | null
          best_comment_id?: number | null
          body: string
          category_id: number
          city?: Database["public"]["Enums"]["city"] | null
          created_at?: string
          edited_at?: string | null
          id?: never
          is_outdated?: boolean
          is_pinned?: boolean
          last_activity_at?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search?: never
          slug?: string
          status?: Database["public"]["Enums"]["thread_status"]
          title: string
        }
        Update: {
          author_id?: string | null
          best_comment_id?: number | null
          body?: string
          category_id?: number
          city?: Database["public"]["Enums"]["city"] | null
          created_at?: string
          edited_at?: string | null
          id?: never
          is_outdated?: boolean
          is_pinned?: boolean
          last_activity_at?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search?: never
          slug?: string
          status?: Database["public"]["Enums"]["thread_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_best_comment_id_fkey"
            columns: ["best_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_reviewed_by_fkey"
            columns: ["reviewed_by"]
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
      is_moderator: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      review_moderator_application: {
        Args: {
          application_id: number
          decision: Database["public"]["Enums"]["application_status"]
        }
        Returns: undefined
      }
      search_threads: {
        Args: { q: string }
        Returns: {
          author_id: string | null
          best_comment_id: number | null
          body: string
          category_id: number
          city: Database["public"]["Enums"]["city"] | null
          created_at: string
          edited_at: string | null
          id: number
          is_outdated: boolean
          is_pinned: boolean
          last_activity_at: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search: unknown
          slug: string
          status: Database["public"]["Enums"]["thread_status"]
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "threads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_user_role: {
        Args: { new_role: Database["public"]["Enums"]["user_role"]; target: string }
        Returns: undefined
      }
    }
    Enums: {
      affiliation: "student" | "graduate" | "postgrad" | "resident"
      application_status: "pending" | "approved" | "rejected"
      city: "erlangen" | "nuremberg" | "both"
      thread_status: "pending" | "published" | "rejected" | "archived"
      user_role: "member" | "moderator" | "superadmin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      affiliation: ["student", "graduate", "postgrad", "resident"],
      application_status: ["pending", "approved", "rejected"],
      city: ["erlangen", "nuremberg", "both"],
      thread_status: ["pending", "published", "rejected", "archived"],
      user_role: ["member", "moderator", "superadmin"],
    },
  },
} as const
