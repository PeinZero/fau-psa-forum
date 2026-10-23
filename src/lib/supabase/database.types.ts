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
      announcements: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: number
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: never
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: never
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          thread_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          thread_id: number
          user_id?: string
        }
        Update: {
          created_at?: string
          thread_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      comment_votes: {
        Row: {
          comment_id: number
          created_at: string
          user_id: string
          value: number
        }
        Insert: {
          comment_id: number
          created_at?: string
          user_id?: string
          value: number
        }
        Update: {
          comment_id?: number
          created_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_votes_user_id_fkey"
            columns: ["user_id"]
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
          parent_id: number | null
          score: number
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
          parent_id?: number | null
          score?: number
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
          parent_id?: number | null
          score?: number
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
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
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
      guide_progress: {
        Row: {
          completed_at: string
          step_id: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          step_id: number
          user_id?: string
        }
        Update: {
          completed_at?: string
          step_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "guide_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_steps: {
        Row: {
          body: string | null
          guide_id: number
          id: number
          position: number
          thread_id: number | null
          title: string
        }
        Insert: {
          body?: string | null
          guide_id: number
          id?: never
          position: number
          thread_id?: number | null
          title: string
        }
        Update: {
          body?: string | null
          guide_id?: number
          id?: never
          position?: number
          thread_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_steps_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_steps_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          is_featured: boolean
          slug: string
          sort_order: number
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          is_featured?: boolean
          slug: string
          sort_order?: number
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          is_featured?: boolean
          slug?: string
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      notification_preferences: {
        Row: {
          email_frequency: string
          muted_types: Database["public"]["Enums"]["notification_type"][]
          updated_at: string
          user_id: string
        }
        Insert: {
          email_frequency?: string
          muted_types?: Database["public"]["Enums"]["notification_type"][]
          updated_at?: string
          user_id?: string
        }
        Update: {
          email_frequency?: string
          muted_types?: Database["public"]["Enums"]["notification_type"][]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          announcement_id: number | null
          comment_id: number | null
          created_at: string
          id: number
          read_at: string | null
          recipient_id: string
          thread_id: number | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          actor_id?: string | null
          announcement_id?: number | null
          comment_id?: number | null
          created_at?: string
          id?: never
          read_at?: string | null
          recipient_id: string
          thread_id?: number | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          actor_id?: string | null
          announcement_id?: number | null
          comment_id?: number | null
          created_at?: string
          id?: never
          read_at?: string | null
          recipient_id?: string
          thread_id?: number | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affiliation: Database["public"]["Enums"]["affiliation"] | null
          announcements_seen_at: string | null
          best_answer_count: number
          created_at: string
          display_name: string
          id: string
          reputation: number
          role: Database["public"]["Enums"]["user_role"]
          username: string
        }
        Insert: {
          affiliation?: Database["public"]["Enums"]["affiliation"] | null
          announcements_seen_at?: string | null
          best_answer_count?: number
          created_at?: string
          display_name: string
          id: string
          reputation?: number
          role?: Database["public"]["Enums"]["user_role"]
          username: string
        }
        Update: {
          affiliation?: Database["public"]["Enums"]["affiliation"] | null
          announcements_seen_at?: string | null
          best_answer_count?: number
          created_at?: string
          display_name?: string
          id?: string
          reputation?: number
          role?: Database["public"]["Enums"]["user_role"]
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          comment_id: number | null
          created_at: string
          details: string | null
          id: number
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          thread_id: number | null
        }
        Insert: {
          comment_id?: number | null
          created_at?: string
          details?: string | null
          id?: never
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          thread_id?: number | null
        }
        Update: {
          comment_id?: number | null
          created_at?: string
          details?: string | null
          id?: never
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          thread_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_events: {
        Row: {
          comment_id: number | null
          created_at: string
          id: number
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          comment_id?: number | null
          created_at?: string
          id?: never
          points: number
          reason: string
          user_id: string
        }
        Update: {
          comment_id?: number | null
          created_at?: string
          id?: never
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_events_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_follows: {
        Row: {
          created_at: string
          thread_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          thread_id: number
          user_id?: string
        }
        Update: {
          created_at?: string
          thread_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_follows_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_restrictions: {
        Row: {
          created_at: string
          reason: string
          restricted_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          reason: string
          restricted_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          reason?: string
          restricted_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_restrictions_restricted_by_fkey"
            columns: ["restricted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_revisions: {
        Row: {
          body: string
          created_at: string
          edited_by: string | null
          id: number
          reviewed_at: string | null
          reviewed_by: string | null
          thread_id: number
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          edited_by?: string | null
          id?: never
          reviewed_at?: string | null
          reviewed_by?: string | null
          thread_id: number
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          edited_by?: string | null
          id?: never
          reviewed_at?: string | null
          reviewed_by?: string | null
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
            foreignKeyName: "thread_revisions_reviewed_by_fkey"
            columns: ["reviewed_by"]
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
          last_verified_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search: unknown
          slug: string
          status: Database["public"]["Enums"]["thread_status"]
          title: string
          verified_by: string | null
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
          last_verified_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search?: never
          slug?: string
          status?: Database["public"]["Enums"]["thread_status"]
          title: string
          verified_by?: string | null
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
          last_verified_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search?: never
          slug?: string
          status?: Database["public"]["Enums"]["thread_status"]
          title?: string
          verified_by?: string | null
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
          {
            foreignKeyName: "threads_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      update_requests: {
        Row: {
          created_at: string
          id: number
          note: string | null
          requester_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["update_request_status"]
          thread_id: number
        }
        Insert: {
          created_at?: string
          id?: never
          note?: string | null
          requester_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["update_request_status"]
          thread_id: number
        }
        Update: {
          created_at?: string
          id?: never
          note?: string | null
          requester_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["update_request_status"]
          thread_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "update_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_requests_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_own_account: { Args: never; Returns: undefined }
      is_moderator: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_thread_verified: { Args: { thread_id: number }; Returns: undefined }
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
          last_verified_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search: unknown
          slug: string
          status: Database["public"]["Enums"]["thread_status"]
          title: string
          verified_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "threads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_threads_v2: {
        Args: {
          p_category_id?: number
          p_city?: Database["public"]["Enums"]["city"]
          p_has_best_answer?: boolean
          p_sort?: string
          p_verified?: boolean
          q: string
        }
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
          last_verified_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search: unknown
          slug: string
          status: Database["public"]["Enums"]["thread_status"]
          title: string
          verified_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "threads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_user_restricted: {
        Args: { reason?: string; restricted: boolean; target: string }
        Returns: undefined
      }
      set_user_role: {
        Args: { new_role: Database["public"]["Enums"]["user_role"]; target: string }
        Returns: undefined
      }
      top_helpers: {
        Args: { since: string }
        Returns: {
          display_name: string
          points: number
          user_id: string
          username: string
        }[]
      }
    }
    Enums: {
      affiliation: "student" | "graduate" | "postgrad" | "resident"
      application_status: "pending" | "approved" | "rejected"
      city: "erlangen" | "nuremberg" | "both"
      notification_type:
        | "reply"
        | "mention"
        | "thread_comment"
        | "thread_approved"
        | "thread_rejected"
        | "best_answer"
        | "application_approved"
        | "application_rejected"
        | "mod_new_thread"
        | "mod_new_application"
        | "mod_new_report"
        | "announcement"
        | "mod_new_update_request"
        | "followed_thread_activity"
      report_reason:
        | "spam"
        | "offensive"
        | "wrong_info"
        | "personal_data"
        | "other"
      report_status: "open" | "resolved" | "dismissed"
      thread_status: "pending" | "published" | "rejected" | "archived"
      update_request_status: "open" | "resolved" | "dismissed"
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
      notification_type: [
        "reply",
        "mention",
        "thread_comment",
        "thread_approved",
        "thread_rejected",
        "best_answer",
        "application_approved",
        "application_rejected",
        "mod_new_thread",
        "mod_new_application",
        "mod_new_report",
        "announcement",
        "mod_new_update_request",
        "followed_thread_activity",
      ],
      report_reason: ["spam", "offensive", "wrong_info", "personal_data", "other"],
      report_status: ["open", "resolved", "dismissed"],
      thread_status: ["pending", "published", "rejected", "archived"],
      update_request_status: ["open", "resolved", "dismissed"],
      user_role: ["member", "moderator", "superadmin"],
    },
  },
} as const
