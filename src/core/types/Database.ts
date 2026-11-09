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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          class: string
          deleted: boolean
          due_date: number | null
          due_range_minutes: string | null
          due_range_start: number | null
          est_pomo_i: string | null
          id: string
          interruption: string | null
          is_untaetigkeit: boolean | null
          last_modified: string
          location: string | null
          parent_id: number | null
          pomo_type: string | null
          project_id: number | null
          status: string | null
          tag_ids: number[] | null
          task_id: number | null
          timestamp_id: number
          title: string
          user_id: string
        }
        Insert: {
          class: string
          deleted?: boolean
          due_date?: number | null
          due_range_minutes?: string | null
          due_range_start?: number | null
          est_pomo_i?: string | null
          id?: string
          interruption?: string | null
          is_untaetigkeit?: boolean | null
          last_modified?: string
          location?: string | null
          parent_id?: number | null
          pomo_type?: string | null
          project_id?: number | null
          status?: string | null
          tag_ids?: number[] | null
          task_id?: number | null
          timestamp_id: number
          title: string
          user_id: string
        }
        Update: {
          class?: string
          deleted?: boolean
          due_date?: number | null
          due_range_minutes?: string | null
          due_range_start?: number | null
          est_pomo_i?: string | null
          id?: string
          interruption?: string | null
          is_untaetigkeit?: boolean | null
          last_modified?: string
          location?: string | null
          parent_id?: number | null
          pomo_type?: string | null
          project_id?: number | null
          status?: string | null
          tag_ids?: number[] | null
          task_id?: number | null
          timestamp_id?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          activity_id: number
          amount: number
          category_tag_ids: Json
          currency: string
          deleted: boolean
          direction: string
          id: string
          last_modified: string
          memo: string | null
          raw_segment: string
          segment_index: number
          timestamp_id: number
          user_id: string
        }
        Insert: {
          activity_id: number
          amount: number
          category_tag_ids?: Json
          currency?: string
          deleted?: boolean
          direction: string
          id?: string
          last_modified?: string
          memo?: string | null
          raw_segment: string
          segment_index: number
          timestamp_id: number
          user_id: string
        }
        Update: {
          activity_id?: number
          amount?: number
          category_tag_ids?: Json
          currency?: string
          deleted?: boolean
          direction?: string
          id?: string
          last_modified?: string
          memo?: string | null
          raw_segment?: string
          segment_index?: number
          timestamp_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ledger_entries_activity"
            columns: ["user_id", "activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["user_id", "timestamp_id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          metadata: Json | null
          room_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          room_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          deleted: boolean
          description: string | null
          due_date: number | null
          id: string
          last_modified: string
          member_ids: Json
          parent_id: number | null
          status: string | null
          tag_id: number | null
          timestamp_id: number
          title: string
          user_id: string
        }
        Insert: {
          deleted?: boolean
          description?: string | null
          due_date?: number | null
          id?: string
          last_modified?: string
          member_ids?: Json
          parent_id?: number | null
          status?: string | null
          tag_id?: number | null
          timestamp_id: number
          title: string
          user_id: string
        }
        Update: {
          deleted?: boolean
          description?: string | null
          due_date?: number | null
          id?: string
          last_modified?: string
          member_ids?: Json
          parent_id?: number | null
          status?: string | null
          tag_id?: number | null
          timestamp_id?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      room_members: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          room_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          room_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          activity_id: number
          deleted: boolean
          done_time: number | null
          id: string
          last_modified: string
          status: string | null
          timestamp_id: number
          user_id: string
        }
        Insert: {
          activity_id: number
          deleted?: boolean
          done_time?: number | null
          id?: string
          last_modified?: string
          status?: string | null
          timestamp_id: number
          user_id: string
        }
        Update: {
          activity_id?: number
          deleted?: boolean
          done_time?: number | null
          id?: string
          last_modified?: string
          status?: string | null
          timestamp_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_schedules_activity"
            columns: ["user_id", "activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["user_id", "timestamp_id"]
          },
        ]
      }
      tags: {
        Row: {
          background_color: string
          color: string
          deleted: boolean
          id: string
          last_modified: string
          name: string
          timestamp_id: number
          user_id: string
        }
        Insert: {
          background_color: string
          color: string
          deleted?: boolean
          id?: string
          last_modified?: string
          name: string
          timestamp_id: number
          user_id: string
        }
        Update: {
          background_color?: string
          color?: string
          deleted?: boolean
          id?: string
          last_modified?: string
          name?: string
          timestamp_id?: number
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          activity_id: number
          deleted: boolean
          description: string | null
          drink_goal_ml: number | null
          energy_records: Json | null
          id: string
          interruption_records: Json | null
          last_modified: string
          life_records: Json | null
          reward_records: Json | null
          starred: boolean | null
          timestamp_id: number
          user_id: string
        }
        Insert: {
          activity_id: number
          deleted?: boolean
          description?: string | null
          drink_goal_ml?: number | null
          energy_records?: Json | null
          id?: string
          interruption_records?: Json | null
          last_modified?: string
          life_records?: Json | null
          reward_records?: Json | null
          starred?: boolean | null
          timestamp_id: number
          user_id: string
        }
        Update: {
          activity_id?: number
          deleted?: boolean
          description?: string | null
          drink_goal_ml?: number | null
          energy_records?: Json | null
          id?: string
          interruption_records?: Json | null
          last_modified?: string
          life_records?: Json | null
          reward_records?: Json | null
          starred?: boolean | null
          timestamp_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_activity"
            columns: ["user_id", "activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["user_id", "timestamp_id"]
          },
        ]
      }
      templates: {
        Row: {
          content: string
          deleted: boolean
          id: string
          last_modified: string
          timestamp_id: number
          title: string
          user_id: string
        }
        Insert: {
          content: string
          deleted?: boolean
          id?: string
          last_modified?: string
          timestamp_id: number
          title: string
          user_id: string
        }
        Update: {
          content?: string
          deleted?: boolean
          id?: string
          last_modified?: string
          timestamp_id?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      timetable_blocks: {
        Row: {
          category: string
          deleted: boolean
          end_time: string
          id: string
          last_modified: string
          start_time: string
          timestamp_id: number
          type: string
          user_id: string
        }
        Insert: {
          category: string
          deleted?: boolean
          end_time: string
          id?: string
          last_modified?: string
          start_time: string
          timestamp_id: number
          type: string
          user_id: string
        }
        Update: {
          category?: string
          deleted?: boolean
          end_time?: string
          id?: string
          last_modified?: string
          start_time?: string
          timestamp_id?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          activity_id: number
          deleted: boolean
          done_time: number | null
          est_pomo: number[] | null
          global_index: number | null
          id: string
          last_modified: string
          priority: number | null
          real_pomo: number[] | null
          start_time: number | null
          status: string | null
          timestamp_id: number
          user_id: string
        }
        Insert: {
          activity_id: number
          deleted?: boolean
          done_time?: number | null
          est_pomo?: number[] | null
          global_index?: number | null
          id?: string
          last_modified?: string
          priority?: number | null
          real_pomo?: number[] | null
          start_time?: number | null
          status?: string | null
          timestamp_id: number
          user_id: string
        }
        Update: {
          activity_id?: number
          deleted?: boolean
          done_time?: number | null
          est_pomo?: number[] | null
          global_index?: number | null
          id?: string
          last_modified?: string
          priority?: number | null
          real_pomo?: number[] | null
          start_time?: number | null
          status?: string | null
          timestamp_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_todos_activity"
            columns: ["user_id", "activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["user_id", "timestamp_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          key: string
          last_modified: string
          user_id: string
          value: Json
        }
        Insert: {
          key: string
          last_modified?: string
          user_id: string
          value?: Json
        }
        Update: {
          key?: string
          last_modified?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_full_schedules:
        | {
            Args: { p_last_modified?: string; p_user_id: string }
            Returns: {
              activityDueRange: Json
              activityId: number
              activityTitle: string
              deleted: boolean
              doneTime: number
              id: number
              interruption: string
              isUntaetigkeit: boolean
              last_modified: string
              location: string
              projectName: string
              status: string
              taskId: number
            }[]
          }
        | {
            Args: {
              p_last_modified: string
              p_limit: number
              p_offset: number
              p_user_id: string
            }
            Returns: {
              activityDueRange: Json
              activityId: number
              activityTitle: string
              deleted: boolean
              doneTime: number
              id: number
              interruption: string
              isUntaetigkeit: boolean
              last_modified: string
              location: string
              projectName: string
              status: string
              taskId: number
            }[]
          }
      get_full_tasks:
        | {
            Args: { p_last_modified?: string; p_user_id: string }
            Returns: {
              activityId: number
              activityTitle: string
              deleted: boolean
              description: string
              drinkGoalMl: number
              energyRecords: Json
              id: number
              interruptionRecords: Json
              last_modified: string
              lifeRecords: Json
              projectName: string
              rewardRecords: Json
              starred: boolean
            }[]
          }
        | {
            Args: {
              p_last_modified: string
              p_limit: number
              p_offset: number
              p_user_id: string
            }
            Returns: {
              activityId: number
              activityTitle: string
              deleted: boolean
              description: string
              drinkGoalMl: number
              energyRecords: Json
              id: number
              interruptionRecords: Json
              last_modified: string
              lifeRecords: Json
              projectName: string
              rewardRecords: Json
              starred: boolean
            }[]
          }
      get_full_todos:
        | {
            Args: { p_last_modified?: string; p_user_id: string }
            Returns: {
              activityId: number
              activityTitle: string
              deleted: boolean
              doneTime: number
              dueDate: number
              estPomo: number[]
              globalIndex: number
              id: number
              interruption: string
              last_modified: string
              pomoType: string
              priority: number
              projectName: string
              realPomo: number[]
              startTime: number
              status: string
              taskId: number
            }[]
          }
        | {
            Args: {
              p_last_modified: string
              p_limit: number
              p_offset: number
              p_user_id: string
            }
            Returns: {
              activityId: number
              activityTitle: string
              deleted: boolean
              doneTime: number
              dueDate: number
              estPomo: number[]
              globalIndex: number
              id: number
              interruption: string
              last_modified: string
              pomoType: string
              priority: number
              projectName: string
              realPomo: number[]
              startTime: number
              status: string
              taskId: number
            }[]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
