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
      agents: {
        Row: {
          capabilities: string[]
          color: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          name: string
          role: string
          sort_order: number
          status: string
          tasks_completed: number
          uptime: string
        }
        Insert: {
          capabilities?: string[]
          color?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          name: string
          role?: string
          sort_order?: number
          status?: string
          tasks_completed?: number
          uptime?: string
        }
        Update: {
          capabilities?: string[]
          color?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          name?: string
          role?: string
          sort_order?: number
          status?: string
          tasks_completed?: number
          uptime?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          sender: string
          text: string
          timestamp: string
        }
        Insert: {
          id?: string
          sender: string
          text: string
          timestamp?: string
        }
        Update: {
          id?: string
          sender?: string
          text?: string
          timestamp?: string
        }
        Relationships: []
      }
      pre_instructions: {
        Row: {
          content: string
          id: string
          updated_at: string
        }
        Insert: {
          content?: string
          id?: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          last_run: string | null
          next_run: string | null
          schedule_days: string[] | null
          schedule_time: string
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_run?: string | null
          next_run?: string | null
          schedule_days?: string[] | null
          schedule_time?: string
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_run?: string | null
          next_run?: string | null
          schedule_days?: string[] | null
          schedule_time?: string
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity: {
        Row: {
          action: string
          created_at: string
          details: string
          id: string
          task_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string
          id?: string
          task_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string
          id: string
          priority: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          title?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string
          id: string
          priority: string
          scheduled_for: string | null
          status: string
          template_id: string | null
          title: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          scheduled_for?: string | null
          status?: string
          template_id?: string | null
          title: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          scheduled_for?: string | null
          status?: string
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_token: string
          id: string
          ip_address: string | null
          is_revoked: boolean
          label: string
          last_seen_at: string
        }
        Insert: {
          created_at?: string
          device_token: string
          id?: string
          ip_address?: string | null
          is_revoked?: boolean
          label?: string
          last_seen_at?: string
        }
        Update: {
          created_at?: string
          device_token?: string
          id?: string
          ip_address?: string | null
          is_revoked?: boolean
          label?: string
          last_seen_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
