// src/core/types/Database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          id: number;
          user_id: string;
          title: string;
          class: "S" | "T" | null;
          project_id: number | null;
          est_pomo_i: string | null;
          due_date: number | null;
          due_range: Json | null;
          interruption: "I" | "E" | null;
          status: string | null;
          location: string | null;
          pomo_type: string | null;
          is_untaetigkeit: boolean | null;
          task_id: number | null;
          tag_ids: number[] | null;
          parent_id: number | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activities"]["Row"], "updated_at" | "created_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["activities"]["Row"], "updated_at" | "created_at">>;
      };
      todos: {
        Row: {
          id: number;
          user_id: string;
          activity_id: number | null;
          activity_title: string | null;
          project_name: string | null;
          task_id: number | null;
          est_pomo: number[] | null;
          real_pomo: number[] | null;
          status: string | null;
          priority: number | null;
          pomo_type: string | null;
          due_date: number | null;
          done_time: number | null;
          start_time: number | null;
          interruption: string | null;
          position_index: number | null;
          global_index: number | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["todos"]["Row"], "updated_at" | "created_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["todos"]["Row"], "updated_at" | "created_at">>;
      };
      schedules: {
        Row: {
          id: number;
          user_id: string;
          activity_id: number | null;
          activity_title: string | null;
          activity_due_range: Json | null;
          task_id: number | null;
          status: string | null;
          project_name: string | null;
          location: string | null;
          done_time: number | null;
          is_untaetigkeit: boolean | null;
          interruption: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["schedules"]["Row"], "updated_at" | "created_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["schedules"]["Row"], "updated_at" | "created_at">>;
      };
      tasks: {
        Row: {
          id: number;
          user_id: string;
          activity_title: string | null;
          project_name: string | null;
          description: string | null;
          source: "todo" | "schedule" | "activity" | null;
          source_id: number | null;
          energy_records: Json;
          reward_records: Json;
          interruption_records: Json;
          starred: boolean | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tasks"]["Row"], "updated_at" | "created_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["tasks"]["Row"], "updated_at" | "created_at">>;
      };
      tags: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          color: string | null;
          background_color: string | null;
          count: number | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tags"]["Row"], "updated_at" | "created_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["tags"]["Row"], "updated_at" | "created_at">>;
      };
      templates: {
        Row: {
          id: number;
          user_id: string;
          title: string;
          content: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["templates"]["Row"], "updated_at" | "created_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["templates"]["Row"], "updated_at" | "created_at">>;
      };
      time_blocks: {
        Row: {
          id: string;
          user_id: string;
          block_type: "work" | "entertainment" | null;
          category: string | null;
          start_time: string | null;
          end_time: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["time_blocks"]["Row"], "updated_at" | "created_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["time_blocks"]["Row"], "updated_at" | "created_at">>;
      };
      daily_pomos: {
        Row: {
          user_id: string;
          date: string;
          count: number | null;
          diff: number | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_pomos"]["Row"], "updated_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["daily_pomos"]["Row"], "updated_at">>;
      };
      user_settings: {
        Row: {
          user_id: string;
          settings: Json;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_settings"]["Row"], "updated_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["user_settings"]["Row"], "updated_at">>;
      };
      global_pomo_count: {
        Row: {
          user_id: string;
          count: number | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["global_pomo_count"]["Row"], "updated_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["global_pomo_count"]["Row"], "updated_at">>;
      };
    };
    Views: {
      [key: string]: never;
    };
    Functions: {
      [key: string]: never;
    };
    Enums: {
      [key: string]: never;
    };
    CompositeTypes: {
      [key: string]: never;
    };
  };
}
